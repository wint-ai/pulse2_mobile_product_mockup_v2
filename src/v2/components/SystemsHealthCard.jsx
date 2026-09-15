/**
 * Systems Health card — v2 (mobile). Pixel rebuild, not a screenshot trace.
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx. Every node below was
 * fetched INDIVIDUALLY — never through the parent that holds the variants,
 * which merges them and hands back the wrong assets.
 *
 *   197704:5707   Systems Health  Property 1=Healthy       (99%, blue gauge)
 *   197704:5709   Systems Health  Property 1=Variant2      (93%, amber gauge)
 *   197704:5731   Systems Health  Property 1=Variant3      (91%, red gauge)
 *   197662:13086  Status bar      Property 1=Default       (four issue tiles)
 *   198209:69852  Status bar      Property 1=no errors 2   (zero state + link)
 *   197697:5670 / 197700:5672 / 197700:5678  — the three gauge symbols.
 *
 * The five nodes above are 1140px-wide desktop bars: one row of
 * gauge + two capsules + divider + four issue capsules. The 375px home frames
 * (198235:81421 zero, 198235:82043 alerts) re-flow that same content into a
 * card — wave banner, two stat tiles, a 2x2 grid of issue counts — so the
 * *styling* below is the desktop nodes verbatim and only the *arrangement*
 * numbers are measured off the two mobile frames at native resolution:
 *
 *   card          bg #fafbfc, 1px white border, radius 22  (node 197662:13086)
 *                 padding 20 / 20 / 16 / 20               (measured)
 *   wave banner   full width x 95, radius 8               (measured; 45% crop)
 *   -> stat row   28 below the banner                     (measured)
 *   stat tiles    2 cols, 24 gutter, capsule h43          (measured / node)
 *   separator     20 above, 21 below, #e2e8f0             (measured; = --border)
 *   issue grid    2 cols, 24 gutter, 12 row gap           (measured)
 *   past-alerts   24 below the grid                       (measured)
 *
 * Landmarks that these numbers reproduce exactly on the 375 frame: banner top,
 * both capsule-row tops, the separator, and the second grid row. The card's
 * own height lands within ~3px of the comp in each state — Figma's text boxes
 * round differently to the browser's and the residue collects in the last row.
 *
 * ── What is verbatim and what is not ──────────────────────────────────────
 * Figma emits every token as `var(--name, <literal>)` and this project defines
 * none of those names, so the literal is what renders — the exact design value
 * with no token wiring. Those classes are copied across untouched: colours,
 * spacing, radii, font sizes, line heights, tracking, weights, the three
 * capsule gradients. Three things could NOT be kept:
 *
 *  1. The font-family utility, whose literal reads 'Geist:SemiBold'.
 *     get_variable_defs resolves font/family/sans AND font/family/heading to
 *     **Figtree**; 'Geist:SemiBold' is Figma's family:style notation, not a
 *     real family, so the literal fallback would drop the browser to its serif
 *     default. Body text therefore carries no font-family at all and inherits
 *     Figtree from `html, body, #root`. The font-weight utility IS kept as
 *     emitted — Tailwind cannot type-infer a var() and falls through to
 *     font-weight, which is what the design means.
 *  2. The drop-shadow on every capsule. get_variable_defs resolves both
 *     layers to `#00000000` at 0 blur / 0 spread — it paints nothing, which
 *     the 375 render confirms (no halo at any capsule edge). It also carries
 *     an unescaped `/` inside calc(), which Tailwind's candidate parser reads
 *     as a modifier delimiter. Dropped as a verified no-op.
 *  3. Figma's two-element text wrapper — an outer flex column at zero leading
 *     around a paragraph carrying the real leading — is flattened to one
 *     element with that leading. Identical box, half the markup.
 *
 * ── Two places the 375 frame disagrees with the named nodes ───────────────
 * Node 198209:69852 paints every zero `colors/slate/300 #cad5e2`, and puts no
 * opacity on the issue counts. The 375 instance samples as #90a1b9 (slate-400)
 * for the attention zero and slate-400 @ 70% for the grid zeros. The named
 * node wins here because it is the binding spec, but the choice lives in one
 * place — swap the two `ZERO …` branches in AttentionCount / IssueCount.
 * Likewise the ⓘ after "Systems Health": all five named nodes carry it, the
 * 375 home instance does not. Kept, and deliberately inert (see below).
 *
 * Assets: Figma's URLs expire in ~7 days, so nothing here references one.
 * Every glyph is the downloaded artwork with its viewBox verbatim, and the
 * wave is inlined as a data URI. Nothing is redrawn or substituted.
 */

import { PowerOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MessageBlocked, WifiDisconnected02 } from '@/v2/icons'
import { cn } from '@/lib/utils'

/* ── Inlined Figma assets ──────────────────────────────────────────────── */

/**
 * The gauge symbol. All three variants (197697:5670 Healty, 197700:5672
 * Intermediate, 197700:5678 Error) resolve to the SAME raster — byte-identical
 * exports, SHA 218000757CEB… — a 1596x1030 "Liquid" render. They differ only
 * in the tint square laid over it with `mix-blend-color`, so the artwork is
 * inlined once.
 *
 * It is a PNG, not an SVG, so it cannot become a JSX path component. Delivered
 * here as JPEG at 513x331 (a ~3x supersample of the 171x110 box the desktop
 * tile draws it in) because the 1596px source is 497KB for a slot that is
 * never wider than ~300 CSS px. Same pixels, same aspect, no crop: only the
 * stray single dark pixel Figma left at (0,0) is healed to its neighbour.
 * The source has no alpha — its ground is #faffff, which is exactly why the
 * design multiplies it onto #ddf1ff.
 */
const WAVE_SRC =
  'data:image/jpeg;base64,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'

// Location Dot — Figma 197697:5656, 27x27. Three concentric #2B7FFF circles,
// the outer two at 10% (colors/blue/500 = #2b7fff, the design's 10% token). The
// design never tints this glyph differently, so the shipped fill stays.
function LocationDot27({ className }) {
  return (
    <svg
      className={className}
      width="27"
      height="27"
      viewBox="0 0 27 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle opacity="0.1" cx="13.5" cy="13.5" r="8.52632" fill="#2B7FFF" />
      <circle opacity="0.1" cx="13.5" cy="13.5" r="13.5" fill="#2B7FFF" />
      <circle cx="13.5" cy="13.5" r="2.84211" fill="#2B7FFF" />
    </svg>
  )
}

// Remix Icons / information-line — Figma 198208:66681, 14x14, fill #90A1B9
// (colors/slate/400). One glyph, one tint in the design; fill left as shipped.
function InformationLine14({ className }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 12.8333C3.77834 12.8333 1.16667 10.2216 1.16667 7C1.16667 3.77834 3.77834 1.16667 7 1.16667C10.2216 1.16667 12.8333 3.77834 12.8333 7C12.8333 10.2216 10.2216 12.8333 7 12.8333ZM7 11.6667C9.57734 11.6667 11.6667 9.57734 11.6667 7C11.6667 4.42267 9.57734 2.33333 7 2.33333C4.42267 2.33333 2.33333 4.42267 2.33333 7C2.33333 9.57734 4.42267 11.6667 7 11.6667ZM6.41667 4.08333H7.58333V5.25H6.41667V4.08333ZM6.41667 6.41667H7.58333V9.91667H6.41667V6.41667Z"
        fill="#90A1B9"
      />
    </svg>
  )
}

/**
 * The valve glyph inside the "Valve errors" capsule — Figma 197662:13041,
 * a 17.2262x16.5 export drawn at 16.009x15.283 (the 22px "Valve status" frame
 * fitted into a 21px box, factor ~0.93). Geometry checked against
 * ValveStatus.jsx `error`: identical path data at exactly 1.375x — a body
 * circle, a stem, a spindle, two side ports and a bang.
 *
 * ValveStatus is NOT reused here on purpose. Its five states each bake in
 * their own palette, and `error` ships #FB2C36 strokes over an #FCD7DB body —
 * but this capsule tints the same glyph slate-400, with only the COUNT in red
 * (sampled off the 375 frame: glyph #90a1b9, count #fb2c36 @ 70%). This is the
 * one case the asset rule calls out, so the strokes become currentColor and
 * the tint comes from the capsule.
 */
function ValveErrorGlyph({ className }) {
  return (
    <svg
      className={className}
      width="16.009"
      height="15.283"
      viewBox="0 0 17.2262 16.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g>
        <path d="M8.61311 15.8914C11.7455 15.8914 14.2849 13.3521 14.2849 10.2197C14.2849 7.08726 11.7455 4.54793 8.61311 4.54793C5.48069 4.54793 2.94136 7.08726 2.94136 10.2197C2.94136 13.3521 5.48069 15.8914 8.61311 15.8914Z" stroke="currentColor" strokeWidth="1.21711" strokeMiterlimit="10" strokeLinecap="round" />
        <path d="M8.6131 2.72229V0.726227" stroke="currentColor" strokeWidth="1.21711" strokeMiterlimit="10" strokeLinecap="round" />
        <path d="M4.31269 0.608557H12.9136" stroke="currentColor" strokeWidth="1.21711" strokeMiterlimit="10" strokeLinecap="round" />
        <g>
          <path d="M2.53971 9.625H0.608557" stroke="currentColor" strokeWidth="1.21711" strokeMiterlimit="10" strokeLinecap="round" />
          <path d="M16.6176 9.62503H14.6865" stroke="currentColor" strokeWidth="1.21711" strokeMiterlimit="10" strokeLinecap="round" />
        </g>
        <path d="M8.6131 6.87667V10.8323" stroke="currentColor" strokeWidth="1.21711" strokeMiterlimit="10" strokeLinecap="round" />
        <path d="M8.61306 14.0293C9.08136 14.0293 9.46098 13.6496 9.46098 13.1813C9.46098 12.7131 9.08136 12.3334 8.61306 12.3334C8.14477 12.3334 7.76514 12.7131 7.76514 13.1813C7.76514 13.6496 8.14477 14.0293 8.61306 14.0293Z" fill="currentColor" />
      </g>
    </svg>
  )
}

/* ── Capsule fills ─────────────────────────────────────────────────────────
   Figma's "Data capsule" style: a translucent blue wash over a white base.
   Three instances with three different angles — kept to the digit, because
   the angle is what puts the light corner opposite the text in each one.
   Verified against the 375 render: the left end samples (237,241,251) and the
   right (229,237,254), which is this gradient composited over white. */
const CAPSULE_PERCENT = {
  backgroundImage:
    'linear-gradient(168.67331019152374deg, rgba(233, 238, 248, 0.8) 8.3855%, rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%, rgba(212, 226, 255, 0.8) 71.236%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
}
const CAPSULE_ATTENTION = {
  backgroundImage:
    'linear-gradient(169.58051988406555deg, rgba(233, 238, 248, 0.8) 8.3855%, rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%, rgba(212, 226, 255, 0.8) 71.236%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
}
const CAPSULE_ISSUE = {
  backgroundImage:
    'linear-gradient(162.23003637965758deg, rgba(233, 238, 248, 0.8) 8.3855%, rgba(227, 235, 249, 0.8) 32.2%, rgba(228, 235, 250, 0.8) 40.822%, rgba(212, 226, 255, 0.8) 71.236%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
}

/* ── MOCK DATA ─────────────────────────────────────────────────────────────
   MOCK — replace with the real account roll-up. Values are the comp's own:
   197704:5707 reads 99% / 8 of 3,431, and 197662:13086 reads 4 / 2 / 1 / 1. */
const MOCK_HEALTHY = { percent: 99, tone: 'healthy' }
const MOCK_STATS = { requireAttention: 8, total: 3431 }
const MOCK_ISSUES = { offline: 4, valve: 2, power: 1, recipients: 1 }

/**
 * The wave banner. Desktop draws it as a 69x69 tile; the 375 frame stretches
 * it to a full-width 95px band. Both are the same construction: an #ddf1ff
 * ground with the raster multiplied onto it, clipped by the rounded box.
 *
 * Framing was solved off the 375 render rather than guessed. Sampling nine
 * columns of the comp's banner and the same nine of the source scaled to the
 * banner's width puts every tone boundary within ~2px at a constant offset of
 * -44px on a 193px-tall render — i.e. `cover` (which at this aspect scales by
 * width) anchored 45% down. The pale corners then land on (217,241,255),
 * which is #ddf1ff x the source's #faffff ground: the multiply is confirmed,
 * not assumed.
 *
 * `isolation: isolate` is not decoration — without it the multiply and the
 * tint's `mix-blend-color` would reach past the banner into the card.
 */
function WaveGauge({ tone }) {
  return (
    <div
      className="relative isolate w-full overflow-hidden rounded-[8px] bg-[#ddf1ff]"
      style={{ height: 95 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage: `url(${WAVE_SRC})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 45%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Node 197701:5683 — a flat #ed9557 square at mix-blend-color, which
          keeps the wave's luminosity and swaps its hue for amber. */}
      {tone === 'intermediate' ? (
        <div className="absolute inset-0 mix-blend-color bg-[#ed9557]" />
      ) : null}
      {/* Node 197701:5688 — same trick, colors/red/500. */}
      {tone === 'error' ? (
        <div className="absolute inset-0 mix-blend-color bg-[var(--colors\/red\/500,#fb2c36)]" />
      ) : null}
    </div>
  )
}

/**
 * The "Require attention" numerator. Node 197697:5662 paints it
 * colors/red/500 at full strength; node 198209:69854;197697:5662 paints the
 * zero colors/slate/300. Both classes are written out rather than switched on
 * a variable, so each stays exactly as Figma emitted it.
 */
function AttentionCount({ zero, children }) {
  return zero ? (
    <p className="leading-[var(--text\/2xl\/lh-relaxed,39px)] text-center text-[color:var(--colors\/slate\/300,#cad5e2)] text-[length:var(--text\/2xl\/size,24px)] tracking-[var(--text\/2xl\/heading-tracking,-0.6px)]">
      {children}
    </p>
  ) : (
    <p className="leading-[var(--text\/2xl\/lh-relaxed,39px)] text-center text-[color:var(--colors\/red\/500,#fb2c36)] text-[length:var(--text\/2xl\/size,24px)] tracking-[var(--text\/2xl\/heading-tracking,-0.6px)]">
      {children}
    </p>
  )
}

/** Issue-tile count. Node 197662:13033 adds opacity-70 to the red; the zero
 *  in node 198209:69862 carries none. */
function IssueCount({ zero, children }) {
  return zero ? (
    <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/2xl\/lh-relaxed,39px)] text-center text-[color:var(--colors\/slate\/300,#cad5e2)] text-[length:var(--text\/2xl\/size,24px)] tracking-[var(--text\/2xl\/heading-tracking,-0.6px)] whitespace-nowrap">
      {children}
    </p>
  ) : (
    <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/2xl\/lh-relaxed,39px)] opacity-70 text-center text-[color:var(--colors\/red\/500,#fb2c36)] text-[length:var(--text\/2xl\/size,24px)] tracking-[var(--text\/2xl\/heading-tracking,-0.6px)] whitespace-nowrap">
      {children}
    </p>
  )
}

/**
 * One of the four issue tiles: capsule (glyph + count) over an xs label.
 * The capsule keeps Figma's height-43 plus 12/20 padding verbatim — the height
 * wins over the padding under border-box, which is what the comp does. Only
 * the desktop's fixed 70px width is replaced by `w-full`: the 375 grid
 * stretches each tile to its column (measured 137px at a 24px gutter).
 */
function IssueTile({ glyph, count, label }) {
  return (
    <div className="flex flex-col gap-[var(--pro\/space\/2\,5,8px)] items-start">
      <div
        className="flex gap-[8px] h-[43px] items-center justify-center min-w-[50px] px-[var(--spacing\/3,12px)] py-[20px] rounded-[var(--rounded-3xl,26px)] w-full text-[color:var(--colors\/slate\/400,#90a1b9)]"
        style={CAPSULE_ISSUE}
      >
        {glyph}
        <IssueCount zero={count === 0}>{count}</IssueCount>
      </div>
      <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh-tight,15px)] text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/xs\/size,12px)] whitespace-nowrap">
        {label}
      </p>
    </div>
  )
}

/**
 * @param healthy   `{ percent, tone }`, or a bare number for the percent.
 *                  `tone` selects the gauge: 'healthy' (197697:5670, blue) |
 *                  'intermediate' (197700:5672, amber) | 'error'
 *                  (197700:5678, red). Defaults to 'healthy' because that is
 *                  what the 375 comps do: 198235:82043 keeps the blue gauge
 *                  while showing 8 systems in red, so the gauge is NOT driven
 *                  by the counts on this screen. The variants read 99 / 93 /
 *                  91%, which is not a threshold either, so the amber and red
 *                  gauges are opt-in rather than derived from an invented
 *                  cutoff — pass `tone` to reach them.
 * @param stats     `{ requireAttention, total }` — the "n / all" capsule.
 * @param issues    `{ offline, valve, power, recipients }` — the 2x2 grid.
 * @param onShowPast  handler for "Show past alerts". The link belongs to the
 *                  zero state only (it exists in node 198209:69852 and not in
 *                  197662:13086). Omit the handler and the link renders inert.
 * @param className merged onto the card.
 */
export default function SystemsHealthCard({
  healthy = MOCK_HEALTHY,
  stats = MOCK_STATS,
  issues = MOCK_ISSUES,
  onShowPast,
  className,
}) {
  const health = typeof healthy === 'number' ? { percent: healthy } : (healthy ?? {})
  const percent = health.percent ?? 0
  const requireAttention = stats?.requireAttention ?? 0
  const total = stats?.total ?? 0

  const offline = issues?.offline ?? 0
  const valve = issues?.valve ?? 0
  const power = issues?.power ?? 0
  const recipients = issues?.recipients ?? 0

  // The whole card's empty state: nothing needs attention anywhere. This is
  // what swaps every red for grey and reveals "Show past alerts".
  const zero =
    requireAttention === 0 && offline === 0 && valve === 0 && power === 0 && recipients === 0

  const tone = health.tone ?? 'healthy'

  return (
    <Card
      className={cn(
        'gap-0 rounded-[var(--rounded-3xl,22px)] border border-solid border-white bg-[#fafbfc] px-5 pt-5 pb-4',
        className,
      )}
    >
      <WaveGauge tone={tone} />

      {/* Stat row — nodes 197697:5653 (percent) and 197697:5659 (attention). */}
      <div className="mt-[28px] grid grid-cols-2 gap-x-6">
        <div className="flex flex-col gap-[var(--pro\/space\/2\,5,8px)] items-start">
          <div
            className="flex gap-[8px] h-[43px] items-center justify-center px-[var(--spacing\/3,12px)] py-[20px] rounded-[var(--rounded-3xl,26px)] w-full"
            style={CAPSULE_PERCENT}
          >
            <LocationDot27 className="shrink-0 size-[27px]" />
            <p className="[word-break:break-word] font-[var(--font\/weight\/font-semibold,600)] leading-[var(--text\/3xl\/lh-none,30px)] text-right text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--font\/size\/text-3xl,30px)] tracking-[-0.75px] whitespace-nowrap">
              {percent}%
            </p>
          </div>
          <div className="flex gap-[2px] items-center">
            <p className="[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/sm\/lh-tight,18px)] text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap">
              Systems Health
            </p>
            {/* Deliberately inert. All five named nodes draw this ⓘ but none
                carries tooltip copy, and this repo's standing rule is to ASK
                before inventing product text — so it stays a mark, not a
                button. Give it a handler the day the copy exists. */}
            <InformationLine14 className="shrink-0 size-[14px]" />
          </div>
        </div>

        <div className="flex flex-col gap-[var(--pro\/space\/2\,5,8px)] items-start font-[var(--font\/weight\/font-medium,500)] whitespace-nowrap">
          <div
            className="flex gap-[6px] h-[43px] items-center justify-center px-[var(--spacing\/3,12px)] py-[20px] rounded-[var(--rounded-3xl,26px)] w-full"
            style={CAPSULE_ATTENTION}
          >
            <AttentionCount zero={requireAttention === 0}>{requireAttention}</AttentionCount>
            <p className="leading-[var(--text\/sm\/lh-tight,18px)] text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/sm\/size,14px)]">
              /
            </p>
            <p className="leading-[var(--text\/2xl\/lh-relaxed,39px)] opacity-70 text-center text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/2xl\/size,24px)] tracking-[var(--text\/2xl\/heading-tracking,-0.6px)]">
              {total.toLocaleString('en-US')}
            </p>
          </div>
          <p className="leading-[var(--text\/sm\/lh-tight,18px)] text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/sm\/size,14px)]">
            Require attention / all
          </p>
        </div>
      </div>

      {/* Node 197662:13025 is a 90px rule between the two halves of the
          desktop bar; the 375 frame turns it horizontal and runs it the full
          content width. Its #e2e8f0 is this project's --border to the byte, so
          the primitive's own `bg-border` is exact — no override needed. */}
      <Separator className="mt-5 mb-[21px]" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {/* Each glyph is drawn at the exact leaf size Figma nests it at, inside
            the icon box Figma gives it — 18px for three of them, 21px for the
            valve (node 197662:13041 "Layer_1"). The project's wifi and
            message-blocked components are the same exports as the ones this
            node returned, path for path, so they are reused rather than
            re-exported; both default to a square, hence the explicit leaf
            width/height that restores their real 16.5x13.5 and 16.5x16.875. */}
        <IssueTile
          glyph={
            <span className="flex size-[18px] shrink-0 items-center justify-center">
              <WifiDisconnected02 width="16.5" height="13.5" />
            </span>
          }
          count={offline}
          label="Offline systems"
        />
        <IssueTile
          glyph={
            <span className="flex size-[21px] shrink-0 items-center justify-center">
              <ValveErrorGlyph />
            </span>
          }
          count={valve}
          label="Valve errors"
        />
        <IssueTile
          glyph={
            <span className="flex size-[18px] shrink-0 items-center justify-center">
              <PowerOff size={18} />
            </span>
          }
          count={power}
          label="Disconnected power"
        />
        <IssueTile
          glyph={
            <span className="flex size-[18px] shrink-0 items-center justify-center">
              <MessageBlocked width="16.5" height="16.875" />
            </span>
          }
          count={recipients}
          label="Missing recipients"
        />
      </div>

      {/* Node 198278:341835 — present only in the "no errors 2" variant. */}
      {zero ? (
        onShowPast ? (
          <button
            type="button"
            onClick={onShowPast}
            className="mt-6 self-start cursor-pointer font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh-tight,15px)] text-[12px] text-[color:var(--wint-blue-accent,#0b81f8)] hover:underline"
          >
            Show past alerts
          </button>
        ) : (
          /* Inert by decision, not by omission: the page owns the past-alerts
             destination and Rule 0 of v2-page-parity forbids inventing a
             route. Pass onShowPast and this becomes a real button. */
          <span
            aria-disabled="true"
            className="mt-6 self-start font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh-tight,15px)] text-[12px] text-[color:var(--wint-blue-accent,#0b81f8)]"
          >
            Show past alerts
          </span>
        )
      ) : null}
    </Card>
  )
}
