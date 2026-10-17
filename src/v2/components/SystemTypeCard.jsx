/**
 * The System page's "System type" card — Figma "System page_mobile", two states:
 *   calm   199296:50210  (inside frame 199296:50183)
 *   alert  199296:50475  (inside frame 199296:50454)
 *
 * It carries the system-type headline ("Water line"), the small branch
 * schematic (device badge + status halo + pipe elbow), the device photo, the
 * serial number, and the device-count chip — plus the disclosure control at
 * the bottom that reveals the system status below the card.
 *
 * ONE COMPONENT, TWO STATES. `tone` is the only switch. The seven things it
 * changes, all measured off the two nodes rather than guessed:
 *   1. root gap            22px (calm) -> 16px (alert)
 *   2. root padding        pt-12 (calm) -> py-12 (alert)
 *   3. content row         items-center + justify-between + px-18 (calm)
 *                          -> items-start + gap-12 + px-20 (alert)
 *   4. heading stack gap   10px (calm) -> 6px (alert)
 *   5. photo halo          the 141px #e9f0fd disc (199296:50243) and the
 *                          wrapper's gap-10 exist in calm ONLY
 *   6. footer stack        gap-12 + h-43 + items-center (calm)
 *                          -> gap-10 + auto height + items-start (alert)
 *      divider            full-width Line 6 (calm) -> fixed 335px Line 4 (alert)
 *      toggle row         auto width, centred by the stack (calm)
 *                          -> w-full + justify-center (alert)
 *   7. toggle label        "Show system status" (calm) -> "Show more" (alert)
 *
 * What `tone` does NOT change, and a literal reading of the two frames is the
 * only way to know it: the card border stays white in both (the red border in
 * the alert frame belongs to the separate Alert card, 199296:50466), the badge
 * halo and status dot stay green (#53c846, ac146.svg is byte-identical in both
 * exports), and every class on the schematic, the chip, the serial and the
 * photo image itself is the same in both states.
 *
 * ASSETS. Nothing new ships. The device photo is the repo's existing
 * `wint-vma-front.png` (the same product shot as Figma's 803b7.png). Every
 * other asset in the node is a circle, a 1px rule or a single-glyph icon, so
 * they are drawn here as CSS or inline SVG rather than shipped as files:
 *   93f3b.svg / ac146.svg / a98db.svg  ->  rounded-full divs
 *   7e55a.svg / 171d3.svg              ->  a 1px #e2e8f0 rule
 *   3d2f7.svg  (Vector 6, the elbow)   ->  <PipeElbow/>, the exported path
 *   67869.svg  (Remix ram-2-line)      ->  <DeviceGlyph/>, the exported path
 *   a7613.svg  (Tabler chevron-down)   ->  <ChevronDown/>, the exported path
 *
 * NOTE ON CLASS STRINGS: Figma's design-token classes contain escaped slashes
 * (`var(--pro\/space\/4,16px)`). A plain JS string eats the backslash, so every
 * shared class string below is String.raw`` — see AlertCard.jsx for the same
 * rule. Do not "tidy" the token names into plain Tailwind spacing: the
 * `data-node-id` attributes plus the verbatim classes are how the next person
 * diffs this file against the frame.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import vmaFront from '@/assets/wint-vma-front.png'

/* ------------------------------------------------------------------ fonts */

const FIG_MED = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`
const FIG_SEMI = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif]`
const FIG_REG = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Regular'),'Figtree','Inter',sans-serif]`

/* ------------------------------------------------------------ class atoms */

/* ORDER MATTERS IN THESE STRINGS. They go through cn() -> tailwind-merge,
   which treats `leading-*` as conflicting with a font-size class (Tailwind's
   `text-sm/6` shorthand sets both) and silently DROPS a `leading-` that sits
   before `text-[length:...]` / `text-[12px]`. Figma emits them alphabetically,
   i.e. leading first, so every line-height below is moved to the end of its
   atom. Same class set as the node, different order, or the card renders at
   the browser's default line-height and every row sits a few px off. */

const CARD = String.raw`bg-[#fafbfc] border border-solid border-white content-stretch flex flex-col items-center justify-center relative rounded-[var(--rounded-3xl,22px)] shrink-0 w-full`

const EYEBROW = String.raw`font-medium relative shrink-0 text-[color:var(--colors\/slate\/400,#90a1b9)] text-[length:var(--text\/button-xs\/size,12px)] leading-[var(--text\/button-xs\/size,12px)]`
const TITLE = String.raw`font-[var(--font\/weight\/font-semibold,600)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/lg\/size,18px)] tracking-[-0.45px] leading-[var(--text\/lg\/lh-none,18px)]`

const BADGE = String.raw`content-stretch flex gap-[var(--component\/badge\/gap,4.8px)] items-center justify-center overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0 size-[24px]`

const BRANCH = String.raw`[word-break:break-word] flex flex-col font-[var(--font\/weight\/font-medium,500)] justify-center relative shrink-0 text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/base\/size,16px)] whitespace-nowrap leading-[0]`
const BRANCH_LINE = String.raw`leading-[var(--text\/base\/lh,24px)]`
const SERIAL = String.raw`[word-break:break-word] font-medium relative shrink-0 text-[color:var(--colors\/slate\/400,#90a1b9)] text-[length:var(--text\/button-xs\/size,12px)] whitespace-nowrap leading-[var(--text\/button-xs\/size,12px)]`

const CHIP = String.raw`absolute bg-[#ebf0fa] content-stretch flex h-[20px] items-center justify-center left-[28px] rounded-[10px] top-[43px] w-[113px]`
const CHIP_TEXT = String.raw`[word-break:break-word] font-[var(--font\/weight\/font-normal,400)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\/slate\/600,#45556c)] text-ellipsis whitespace-pre leading-[0]`
const CHIP_RUN = String.raw`leading-[var(--text\/xs\/lh-none,12px)]`

const TOGGLE_LABEL = String.raw`[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/xs\/size,12px)] whitespace-nowrap leading-[var(--text\/xs\/lh,16px)]`

/* The rule in the node is an exported 1px #e2e8f0 bitmap sitting in a zero-height
   box, so the line costs no vertical space and the stack's gap alone spaces it. */
const RULE_FILL = String.raw`absolute inset-[-1px_0_0_0] bg-[var(--colors\/slate\/200,#e2e8f0)]`

/* The glyph and the pipe run carry their token colour on the wrapper so the
   inline SVGs below can stay currentColor. */
const GLYPH_COLOR = String.raw`text-[color:var(--colors\/slate\/400,#90a1b9)]`
const PIPE_COLOR = String.raw`text-[color:var(--colors\/slate\/300,#cad5e2)]`
const CHEVRON_COLOR = String.raw`text-[color:var(--colors\/slate\/500,#62748e)]`

/* ------------------------------------------------------------------ icons */

/* Remix Icons / ram-2-line, 67869.svg — the device (meter/valve unit) glyph.
   Drawn at 19.749px over its natural 16.4571 viewBox, exactly as the node
   stretches it. Recoloured to currentColor so the badge owns the colour. */
const DeviceGlyph = ({ size = 19.749, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16.4571 16.4571"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M1.37143 3.42857C0.992722 3.42857 0.685714 3.73558 0.685714 4.11429V10.2857C0.685714 10.6644 0.992722 10.9714 1.37143 10.9714V12.3429C1.37143 12.7216 1.67844 13.0286 2.05714 13.0286H7.14117L7.82688 12.3429H8.63026L9.31598 13.0286H14.4C14.7787 13.0286 15.0857 12.7216 15.0857 12.3429V10.9714C15.4644 10.9714 15.7714 10.6644 15.7714 10.2857V4.11429C15.7714 3.73558 15.4644 3.42857 15.0857 3.42857H1.37143ZM13.7143 10.9714V11.6571H9.88402L9.19831 10.9714H13.7143ZM7.25883 10.9714L6.57311 11.6571H2.74286V10.9714H7.25883ZM2.05714 9.6V4.8H14.4V9.6H2.05714ZM3.42857 6.17143H4.8V8.22857H3.42857V6.17143ZM7.54286 6.17143H6.17143V8.22857H7.54286V6.17143ZM8.91429 6.17143H10.2857V8.22857H8.91429V6.17143ZM13.0286 6.17143H11.6571V8.22857H13.0286V6.17143Z"
      fill="currentColor"
    />
  </svg>
)

/* Tabler Icons / chevron-down, a7613.svg. */
const ChevronDown = (props) => (
  <svg
    viewBox="0 0 17.36 17.36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M4.34 6.51L8.68 10.85L13.02 6.51"
      stroke="currentColor"
      strokeWidth="1.085"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/* Vector 6, 3d2f7.svg — the pipe run leaving the device badge: down, then a
   9px-radius elbow out to the right. preserveAspectRatio="none" because the
   node stretches the 13.5x26.5 art into a 13x26 box. */
const PipeElbow = (props) => (
  <svg
    viewBox="0 0 13.5 26.5"
    fill="none"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M0.5 0V17C0.5 21.9706 4.52944 26 9.5 26H13.5"
      stroke="currentColor"
    />
  </svg>
)

/* ------------------------------------------------------------------ model */

/* The halo and dot are #53c846 in both frames. The other tones are this app's
   existing status palette, so a system that is not healthy can say so without
   the card needing a second variant. */
const STATUS_COLOR = {
  ok: '#53c846',
  warn: '#f0b100',
  alert: '#fb2c36',
  offline: '#90a1b9',
}
const STATUS_LABEL = {
  ok: 'Online',
  warn: 'Needs attention',
  alert: 'Alerting',
  offline: 'Offline',
}

/* `devices` takes plain strings ("1 Valve") or {count, label} pairs. */
const deviceText = (d) =>
  d && typeof d === 'object' ? `${d.count} ${d.label}` : String(d)

/**
 * @param {string}   title         the system type, e.g. "Water line"
 * @param {string}   typeLabel     the eyebrow above it
 * @param {string}   topology      the branch the schematic is drawn for, e.g. "Supply"
 * @param {Array}    devices       chip runs: ['1 Valve', '1 Meters'] or [{count,label}]
 * @param {string}   serialNumber  drawn verbatim — pass the "SN " prefix if you want it
 * @param {string}   photo         device photo src
 * @param {string}   photoAlt      '' (decorative) by default; the card already
 *                                 names the device in text
 * @param {string}   status        'ok' | 'warn' | 'alert' | 'offline' — the badge dot
 * @param {string}   statusLabel   accessible name for that dot
 * @param {string}   tone          'calm' | 'alert'
 * @param {boolean}  expanded      controlled disclosure state; omit for uncontrolled
 * @param {Function} onToggle      called with the next expanded state
 * @param {string}   toggleLabel   footer control text; defaults per tone
 * @param {string}   className     appended to the card root
 */
export default function SystemTypeCard({
  title = 'Water line',
  typeLabel = 'System type',
  topology = 'Supply',
  devices = ['1 Valve', '1 Meters'],
  serialNumber = 'SN 4471822',
  photo = vmaFront,
  photoAlt = '',
  status = 'ok',
  statusLabel,
  tone = 'calm',
  expanded,
  onToggle,
  toggleLabel,
  className,
}) {
  const alert = tone === 'alert'

  /* Controlled when `expanded` is passed, uncontrolled otherwise. The frame has
     no behaviour, and a disclosure control that does nothing is worse than no
     control at all — so the card can always open itself. */
  const [selfExpanded, setSelfExpanded] = useState(false)
  const isExpanded = expanded ?? selfExpanded

  const handleToggle = () => {
    const next = !isExpanded
    if (expanded === undefined) setSelfExpanded(next)
    onToggle?.(next)
  }

  const dotColor = STATUS_COLOR[status] ?? STATUS_COLOR.ok
  const dotLabel = statusLabel ?? STATUS_LABEL[status] ?? STATUS_LABEL.ok
  const label = toggleLabel ?? (alert ? 'Show more' : 'Show system status')

  /* 199296:50216 / 199296:50481 — identical in both states. */
  const schematic = (
    <div
      className="content-stretch flex flex-col gap-[18px] items-center relative shrink-0"
      data-node-id={alert ? '199296:50481' : '199296:50216'}
    >
      <div
        className="content-stretch flex gap-[4px] items-center relative shrink-0"
        data-node-id={alert ? '199296:50482' : '199296:50217'}
      >
        <div
          className="content-stretch flex gap-[4px] items-center relative shrink-0"
          data-node-id={alert ? '199296:50485' : '199296:50220'}
        >
          <div
            className="content-stretch flex gap-[4px] items-center relative shrink-0"
            data-node-id={alert ? '199296:50486' : '199296:50221'}
          >
            {/* badge + halo + status dot */}
            <div
              className="content-stretch flex gap-[6px] items-end relative shrink-0"
              data-node-id={alert ? '199296:50487' : '199296:50222'}
            >
              <div
                className={cn(BADGE, GLYPH_COLOR)}
                data-name="Badge"
                data-node-id={alert ? '199296:50490' : '199296:50225'}
              >
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="leftIcon">
                  <div
                    className="relative shrink-0 size-[19.749px]"
                    data-name="Remix Icons / ram-2-line"
                    data-node-id={alert ? '199296:50489' : '199296:50224'}
                  >
                    <DeviceGlyph size="100%" className="absolute inset-0 block" />
                  </div>
                </div>
              </div>
              {/* Ellipse 3 — the 10%-opacity status halo behind the glyph. */}
              <div
                className="absolute left-[-2px] opacity-[calc(var(--opacity-10,100)/100)] size-[29px] top-[-3px]"
                data-node-id={alert ? '199296:50491' : '199296:50226'}
                aria-hidden="true"
              >
                <div className="block size-full rounded-full opacity-[0.1]" style={{ backgroundColor: dotColor }} />
              </div>
              {/* Ellipse 2 — the solid status dot. */}
              <div
                className="absolute left-[20px] size-[6px] top-[19px]"
                data-node-id={alert ? '199296:50492' : '199296:50227'}
                role="img"
                aria-label={dotLabel}
              >
                <div className="block size-full rounded-full" style={{ backgroundColor: dotColor }} />
              </div>
            </div>
            <div
              className="flex flex-row items-center self-stretch"
              data-node-id={alert ? '199296:50493' : '199296:50228'}
            >
              <div className="content-stretch flex gap-[6px] h-full items-center relative shrink-0">
                <div
                  className={cn(FIG_MED, BRANCH)}
                  data-node-id={alert ? '199296:50494' : '199296:50229'}
                >
                  <p className={BRANCH_LINE}>{topology}</p>
                </div>
                <div
                  className="content-stretch flex h-full items-center justify-center pt-[5px] relative shrink-0"
                  data-node-id={alert ? '199296:50495' : '199296:50230'}
                >
                  <p
                    className={cn(FIG_MED, SERIAL)}
                    dir="auto"
                    data-node-id={alert ? '199296:50496' : '199296:50231'}
                  >
                    {serialNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* device-count chip */}
      <div className={CHIP} data-node-id={alert ? '199296:50505' : '199296:50240'}>
        <p
          className={cn(FIG_REG, CHIP_TEXT)}
          dir="auto"
          data-node-id={alert ? '199296:50506' : '199296:50241'}
        >
          {devices.map((d, i) => {
            const last = i === devices.length - 1
            return (
              <span key={`${deviceText(d)}-${i}`}>
                {i > 0 ? <span className={cn(CHIP_RUN, 'text-[#90a1b9]')}>{'|  '}</span> : null}
                <span className={CHIP_RUN}>{last ? deviceText(d) : `${deviceText(d)} `}</span>
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )

  return (
    <div
      className={cn(CARD, alert ? 'gap-[16px] py-[12px]' : 'gap-[22px] pt-[12px]', className)}
      data-name="IOT overview"
      data-node-id={alert ? '199296:50475' : '199296:50210'}
    >
      {/* content row — 199296:50211 / 199296:50476 */}
      <div
        className={cn(
          'content-stretch flex h-[121px] relative shrink-0 w-full',
          alert ? 'gap-[12px] items-start px-[20px]' : 'items-center justify-between px-[18px]',
        )}
        data-node-id={alert ? '199296:50476' : '199296:50211'}
      >
        <div
          className="content-stretch flex flex-col gap-[22px] h-full items-start relative shrink-0 w-[158px]"
          data-node-id={alert ? '199296:50477' : '199296:50212'}
        >
          <div
            className={cn(
              '[word-break:break-word] content-stretch flex flex-col items-start relative shrink-0 whitespace-nowrap',
              alert ? 'gap-[6px]' : 'gap-[10px]',
            )}
            data-node-id={alert ? '199296:50478' : '199296:50213'}
          >
            <p
              className={cn(FIG_MED, EYEBROW)}
              dir="auto"
              data-node-id={alert ? '199296:50479' : '199296:50214'}
            >
              {typeLabel}
            </p>
            <p
              className={cn(FIG_SEMI, TITLE)}
              dir="auto"
              data-node-id={alert ? '199296:50480' : '199296:50215'}
            >
              {title}
            </p>
          </div>
          {schematic}
        </div>

        {/* device photo — 199296:50242 / 199296:50507. The #e9f0fd disc behind
            it (199296:50243) and the wrapper's gap-10 are calm-only. */}
        <div
          className={cn(
            'content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 w-[116px]',
            alert ? null : 'gap-[10px]',
          )}
          data-node-id={alert ? '199296:50507' : '199296:50242'}
        >
          {alert ? null : (
            <div
              className="absolute left-[-14px] size-[141px] top-[-10.5px]"
              data-node-id="199296:50243"
              aria-hidden="true"
            >
              <div className="block size-full rounded-full bg-[#e9f0fd]" />
            </div>
          )}
          <div
            className="h-[116px] mix-blend-multiply relative shrink-0 w-[97px]"
            data-name="VMA_Front_5189 2"
            data-node-id={alert ? '199296:50508' : '199296:50244'}
          >
            <img
              alt={photoAlt}
              className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
              src={photo}
            />
          </div>
        </div>
      </div>

      {/* Vector 6 — the pipe run out of the badge. Positioned against the card
          root, which is why the card is `relative`. */}
      <div
        className={cn('absolute h-[26px] left-[29px] top-[97px] w-[13px]', PIPE_COLOR)}
        data-node-id={alert ? '199296:50509' : '199296:50245'}
        aria-hidden="true"
      >
        <div className="absolute inset-[0_0_-1.92%_-3.85%]">
          <PipeElbow className="block max-w-none size-full" />
        </div>
      </div>

      {/* footer — 199296:50246 / 199296:50510 */}
      <div
        className={cn(
          'content-stretch flex flex-col relative shrink-0 w-full',
          alert ? 'gap-[10px] items-start' : 'gap-[12px] h-[43px] items-center',
        )}
        data-node-id={alert ? '199296:50510' : '199296:50246'}
      >
        <div
          /* Figma pins the alert divider at w-[335px], which is the frame's
             full width — the designer drew it edge-to-edge. Inside this card's
             own padding the content box is 317px at 393, so taken literally it
             hangs 18px out and gives the whole page a horizontal scrollbar.
             w-full is what 335 was expressing. */
          className={cn('h-0 relative shrink-0 w-full', alert ? 'max-w-[335px]' : null)}
          data-node-id={alert ? '199296:50511' : '199296:50247'}
          aria-hidden="true"
        >
          <div className={RULE_FILL} />
        </div>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          className={cn(
            'content-stretch flex items-center relative shrink-0 cursor-pointer bg-transparent border-0 p-0',
            alert ? 'justify-center w-full' : null,
          )}
          data-node-id={alert ? '199296:50512' : '199296:50248'}
        >
          <span
            className={cn(FIG_MED, TOGGLE_LABEL)}
            dir="auto"
            data-node-id={alert ? '199296:50513' : '199296:50249'}
          >
            {label}
          </span>
          <span
            className={cn('relative shrink-0 size-[17.36px]', CHEVRON_COLOR)}
            data-name="Tabler Icons / chevron-down"
            data-node-id={alert ? '199296:50514' : '199296:50250'}
          >
            <ChevronDown
              className={cn(
                'absolute inset-0 block max-w-none size-full transition-transform duration-200',
                isExpanded ? 'rotate-180' : null,
              )}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
