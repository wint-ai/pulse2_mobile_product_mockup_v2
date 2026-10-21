/**
 * The System page's "System type" card — Figma "System page_mobile".
 *
 * RECONCILED 2026-10-20 against the current pair of frames:
 *   alert  199383:141519  (inside frame 199383:141499 — the frame that also
 *                          carries the red-bordered "Alert card" 199383:141993)
 *   calm   199359:126797  (inside frame 199359:126785 — no alert card, and it
 *                          continues into the "Water consumption_M" chart)
 * The older pair (199296:50210 calm / 199296:50475 alert) is superseded. The
 * tone -> frame mapping above is read off the PAGE CONTEXT: the frame with an
 * Alert card above the stack is the alerting state, exactly as the old pair
 * was arranged. See "WHERE THE TWO FRAMES DISAGREE" below — they swapped the
 * two layouts relative to the old pair, which is surprising enough to be worth
 * a second pair of eyes before this ships.
 *
 * It carries the system-type headline ("Water line"), the small branch
 * schematic (device badge + status halo + pipe elbow), the device photo, the
 * serial number, and the device-count chip — plus the disclosure control at
 * the bottom that reveals the system status below the card.
 *
 * ONE COMPONENT, TWO STATES. `tone` is the only switch, and the new frames
 * shrink what it changes to FOUR things, all measured off the two nodes:
 *   1. content row   h-[144px] items-center justify-between px-[16px]  (alert)
 *                    -> gap-[12px] h-[121px] items-start px-[20px]     (calm)
 *   2. title size    text-xl 20px / leading 32.5px, no tracking        (alert)
 *                    -> text-lg 18px / leading 18px / -0.45px tracking (calm)
 *   3. pipe elbow    left-[32px] top-[121px]  (alert, the taller row)
 *                    -> left-[29px] top-[97px]                         (calm)
 *   4. divider       w-full (alert) -> w-[335px] (calm, see the note there)
 *
 * What `tone` no longer changes, because the two frames now agree on it:
 *   - the card chassis: gap-[16px] py-[12px] items-center justify-center
 *   - the heading stack gap: 6px in both (was 10px in the old calm node)
 *   - the eyebrow: 14px/20px on --foreground (was 12px slate-400 in both old
 *     nodes — this is the single biggest visual change in this pass)
 *   - the photo wrapper: no gap, and NO #e9f0fd halo disc. The old calm node's
 *     141px disc (199296:50243) is gone from both new frames; it is deleted
 *     here rather than kept behind a flag.
 *   - the footer: gap-[10px] items-start, no fixed h-[43px]
 *   - the toggle row: w-full + justify-center
 *   - the toggle label: "Show more" in BOTH frames. The old calm default
 *     "Show system status" is gone; the `toggleLabel` prop still overrides it
 *     and the disclosure behaviour is untouched.
 *   - the badge, halo, status dot, branch text, serial and chip: byte-identical
 *     classes in both frames, and unchanged from the old pair.
 *
 * WHERE THE TWO FRAMES DISAGREE (and this file therefore has to pick a side):
 * the four `tone` branches above ARE the disagreements. There is no third
 * source that says which layout belongs to which state, only the page context.
 * Note that relative to the OLD pair the layouts are swapped: old-calm was
 * items-center/justify-between (now alert) and old-alert was items-start/
 * gap-[12px] (now calm). If that swap turns out to be a Figma inconsistency
 * rather than a decision, flipping it is a one-line change in each branch.
 *
 * ASSETS. Nothing new ships, and nothing is hotlinked. Every asset hash in the
 * card region is identical across both frames, and identical to the old pair:
 *   803b7.png  (VMA_Front_5189 2)   ->  the repo's `wint-vma-front.png`
 *   93f3b.svg / ac146.svg           ->  rounded-full divs (status halo + dot)
 *   cb6bd.svg (alert) / 171d3.svg (calm)  ->  a 1px #e2e8f0 rule. Two hashes
 *                                       because the two rules are drawn at
 *                                       different widths; same 1px fill.
 *   3d2f7.svg  (Vector 6, the elbow)->  <PipeElbow/>, the exported path
 *   67869.svg  (Remix ram-2-line)   ->  <DeviceGlyph/>, the exported path
 *   a7613.svg  (Tabler chevron-down)->  <ChevronDown/>, the exported path
 *
 * NOTE ON CLASS STRINGS: Figma's design-token classes contain escaped slashes
 * (`var(--pro\/space\/4,16px)`). A plain JS string eats the backslash, so every
 * shared class string below is String.raw`` — see AlertCard.jsx for the same
 * rule. Do not "tidy" the token names into plain Tailwind spacing: the
 * `data-node-id` attributes plus the verbatim classes are how the next person
 * diffs this file against the frame.
 */
import { useId, useState } from 'react'
import { Gauge, Plug, Wifi, WifiOff } from 'lucide-react'
import ValveStatus from '@/v2/components/ValveStatus'
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

/* 199383:141519 / 199359:126797 — identical in both frames, chassis included. */
const CARD = String.raw`bg-[#fafbfc] border border-solid border-white content-stretch flex flex-col gap-[16px] items-center justify-center py-[12px] relative rounded-[var(--rounded-3xl,22px)] shrink-0 w-full`

/* 199383:141523 / 199359:126801 — 14px on --foreground in BOTH new frames. */
const EYEBROW = String.raw`font-[var(--font\/weight\/font-medium,500)] relative shrink-0 text-[color:var(--foreground,#0a0a0a)] text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)]`

/* 199383:141524 / 199359:126802 — the one type ramp the two frames disagree on. */
const TITLE = String.raw`font-[var(--font\/weight\/font-semibold,600)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)]`
const TITLE_ALERT = String.raw`text-[length:var(--text\/xl\/size,20px)] leading-[var(--text\/xl\/lh-relaxed,32.5px)]`
const TITLE_CALM = String.raw`text-[length:var(--text\/lg\/size,18px)] tracking-[-0.45px] leading-[var(--text\/lg\/lh-none,18px)]`

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

/* Tabler Icons / chevron-down, a7613.svg — the same hash in both frames. */
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

/* The halo and dot are #53c846 in both frames (ac146.svg / 93f3b.svg are the
   same hashes in both exports). The other tones are this app's existing status
   palette, so a system that is not healthy can say so without the card needing
   a second variant. */
/* ── expanded body — 199427:138742 ─────────────────────────────────────────
 * The disclosure used to reveal NOTHING. `isExpanded` set aria-expanded and
 * rotated the chevron, and that was all: the control promised a region to a
 * screen reader that did not exist, and did nothing at all for everyone else.
 * The owner, on the way it opens: "show more/less is blocking".
 *
 * 199427:138706 is the open state of this card, 397px against the closed
 * 190px, and 199427:138742 is what fills the gap — a "System status" heading
 * with the toggle on its RIGHT, then five rows with two rules between them.
 * The centred "Show more" footer is not kept alongside it: in the open frame
 * the control has moved into that heading, so the card has one toggle, not
 * two.
 */
const BODY = String.raw`content-stretch flex flex-col gap-[16px] items-start px-[20px] relative shrink-0 w-full`
const BODY_HEAD = String.raw`content-stretch flex h-[18px] items-center justify-between relative shrink-0 w-full`
const BODY_TITLE = String.raw`[word-break:break-word] font-[var(--font\/weight\/font-semibold,600)] relative shrink-0 text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/lg\/size,18px)] tracking-[-0.45px] whitespace-nowrap leading-[var(--text\/lg\/lh-none,18px)]`
const BODY_TOGGLE = String.raw`content-stretch flex items-center relative shrink-0 cursor-pointer bg-transparent border-0 p-0 after:absolute after:content-[''] after:inset-x-[-8px] after:inset-y-[-14px]`
const BODY_TOGGLE_TEXT = String.raw`[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/xs\/size,12px)] whitespace-nowrap leading-[var(--text\/xs\/lh,16px)]`
const ROWS = String.raw`content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full`
const ROW = String.raw`content-stretch flex items-center justify-between relative shrink-0 w-full`
const ROW_LEFT = String.raw`content-stretch flex gap-[6px] items-center relative shrink-0`
const ROW_LABEL = String.raw`[word-break:break-word] font-medium relative shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[length:var(--text\/sm-tight\/size,14px)] whitespace-nowrap leading-[var(--text\/sm-tight\/lh,20px)]`
const ROW_RIGHT = String.raw`content-stretch flex gap-[5px] items-center justify-end relative shrink-0`
const ROW_VALUE = String.raw`[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] relative shrink-0 text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/sm\/size,14px)] whitespace-nowrap leading-[var(--text\/sm\/lh,20px)]`
const ROW_BADGE = String.raw`content-stretch flex items-center justify-center overflow-clip relative rounded-[var(--component\/badge\/radius,31.2px)] shrink-0 size-[24px]`

/* The node's 22px "Location Dot" on the Power and Connectivity rows is a
   status indicator, not a pin: a filled dot inside a pale disc of the same
   hue. Green when the thing is as it should be, red when it is not — and the
   row always PRINTS its state beside it, so colour is never the only carrier
   (WCAG 1.4.1). */
function StatusDot({ ok }) {
  return (
    <span
      className={cn(
        'content-stretch flex items-center justify-center relative shrink-0 size-[22px] rounded-full',
        ok ? 'bg-[#dcfce7]' : 'bg-[#ffe2e2]',
      )}
      aria-hidden="true"
      data-name="Location Dot"
    >
      <span className={cn('block rounded-full size-[7px]', ok ? 'bg-[#00a63e]' : 'bg-[#e7000b]')} />
    </span>
  )
}

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
 * @param {string}   toggleLabel   footer control text; defaults to Figma's "Show more"
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
  /** { valve, comm, power } — the system's own state, for the open body. */
  systemStatus,
  className,
}) {
  const alert = tone === 'alert'

  /* Controlled when `expanded` is passed, uncontrolled otherwise. The frame has
     no behaviour, and a disclosure control that does nothing is worse than no
     control at all — so the card can always open itself. */
  const [selfExpanded, setSelfExpanded] = useState(false)
  /* aria-controls needs a stable id, and two of these cards can be on one page. */
  const bodyId = useId()
  const isExpanded = expanded ?? selfExpanded

  const handleToggle = () => {
    const next = !isExpanded
    if (expanded === undefined) setSelfExpanded(next)
    onToggle?.(next)
  }

  const dotColor = STATUS_COLOR[status] ?? STATUS_COLOR.ok
  const dotLabel = statusLabel ?? STATUS_LABEL[status] ?? STATUS_LABEL.ok
  /* Both CLOSED frames say "Show more"; the open one says "Show less", in its
     own heading. `toggleLabel` still overrides the closed label. */
  const label = toggleLabel ?? 'Show more'

  /* 199427:138748's five rows, against the system's real state.
     Power / Connectivity / Valve come straight off the dataset. METER DOES
     NOT EXIST IN IT — `unitsFor` carries a meter MODEL, never a meter state —
     so rather than invent a fault the row reports what can actually be known:
     a meter you cannot reach is not reporting. Flagged here so it is not
     mistaken for real telemetry. */
  const st = systemStatus ?? {}
  const online = st.comm !== 'offline'
  const POWER = { ac: 'AC', 'ac-lost': 'AC lost', battery: 'Battery' }
  const VALVE = { open: 'Open', closed: 'Closed', error: 'Error' }
  const statusRows = [
    { key: 'unit', label: 'IOT Unit', glyph: 'device', value: null },
    { key: 'power', label: 'Power', glyph: 'dot', ok: st.power === 'ac', value: POWER[st.power] ?? 'Unknown', icon: 'plug' },
    { key: 'comm', label: 'Connectivity', glyph: 'dot', ok: online, value: online ? 'Connected' : 'Disconnected', icon: 'wifi' },
    { key: 'valve', label: 'Valve', glyph: 'valve', rule: true, value: VALVE[st.valve] ?? 'Unknown', icon: 'valve' },
    { key: 'meter', label: 'Meter', glyph: 'gauge', rule: true, value: online ? 'Running' : 'Not reporting', icon: 'plug' },
  ]

  /* 199383:141525 / 199359:126803 — identical in both frames. */
  const schematic = (
    <div
      className="content-stretch flex flex-col gap-[18px] items-center relative shrink-0"
      data-node-id={alert ? '199383:141525' : '199359:126803'}
    >
      <div
        className="content-stretch flex gap-[4px] items-center relative shrink-0"
        data-node-id={alert ? '199383:141526' : '199359:126804'}
      >
        <div
          className="content-stretch flex gap-[4px] items-center relative shrink-0"
          data-node-id={alert ? '199383:141529' : '199359:126807'}
        >
          <div
            className="content-stretch flex gap-[4px] items-center relative shrink-0"
            data-node-id={alert ? '199383:141530' : '199359:126808'}
          >
            {/* badge + halo + status dot */}
            <div
              className="content-stretch flex gap-[6px] items-end relative shrink-0"
              data-node-id={alert ? '199383:141531' : '199359:126809'}
            >
              <div
                className={cn(BADGE, GLYPH_COLOR)}
                data-name="Badge"
                data-node-id={alert ? '199383:141532' : '199359:126810'}
              >
                <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="leftIcon">
                  <div
                    className="relative shrink-0 size-[19.749px]"
                    data-name="Remix Icons / ram-2-line"
                    data-node-id={alert ? '199383:141653' : '199359:126935'}
                  >
                    <DeviceGlyph size="100%" className="absolute inset-0 block" />
                  </div>
                </div>
              </div>
              {/* Ellipse 3 — the 10%-opacity status halo behind the glyph. */}
              <div
                className="absolute left-[-2px] opacity-[calc(var(--opacity-10,100)/100)] size-[29px] top-[-3px]"
                data-node-id={alert ? '199383:141533' : '199359:126811'}
                aria-hidden="true"
              >
                <div className="block size-full rounded-full opacity-[0.1]" style={{ backgroundColor: dotColor }} />
              </div>
              {/* Ellipse 2 — the solid status dot. */}
              <div
                className="absolute left-[20px] size-[6px] top-[19px]"
                data-node-id={alert ? '199383:141534' : '199359:126812'}
                role="img"
                aria-label={dotLabel}
              >
                <div className="block size-full rounded-full" style={{ backgroundColor: dotColor }} />
              </div>
            </div>
            <div
              className="flex flex-row items-center self-stretch"
              data-node-id={alert ? '199383:141535' : '199359:126813'}
            >
              <div className="content-stretch flex gap-[6px] h-full items-center relative shrink-0">
                <div
                  className={cn(FIG_MED, BRANCH)}
                  data-node-id={alert ? '199383:141536' : '199359:126814'}
                >
                  <p className={BRANCH_LINE}>{topology}</p>
                </div>
                <div
                  className="content-stretch flex h-full items-center justify-center pt-[5px] relative shrink-0"
                  data-node-id={alert ? '199383:141537' : '199359:126815'}
                >
                  <p
                    className={cn(FIG_MED, SERIAL)}
                    dir="auto"
                    data-node-id={alert ? '199383:141538' : '199359:126816'}
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
      <div className={CHIP} data-node-id={alert ? '199383:141543' : '199359:126821'}>
        <p
          className={cn(FIG_REG, CHIP_TEXT)}
          dir="auto"
          data-node-id={alert ? '199383:141544' : '199359:126822'}
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
      className={cn(CARD, className)}
      data-name="IOT overview"
      data-node-id={alert ? '199383:141519' : '199359:126797'}
    >
      {/* content row — 199383:141520 / 199359:126798. The one structural
          disagreement between the two frames; see the header note. */}
      <div
        className={cn(
          'content-stretch flex relative shrink-0 w-full',
          alert
            ? 'h-[144px] items-center justify-between px-[16px]'
            : 'gap-[12px] h-[121px] items-start px-[20px]',
        )}
        data-node-id={alert ? '199383:141520' : '199359:126798'}
      >
        <div
          className="content-stretch flex flex-col gap-[22px] h-full items-start relative shrink-0 w-[158px]"
          data-node-id={alert ? '199383:141521' : '199359:126799'}
        >
          <div
            className="[word-break:break-word] content-stretch flex flex-col gap-[6px] items-start relative shrink-0 whitespace-nowrap"
            data-node-id={alert ? '199383:141522' : '199359:126800'}
          >
            <p
              className={cn(FIG_MED, EYEBROW)}
              dir="auto"
              data-node-id={alert ? '199383:141523' : '199359:126801'}
            >
              {typeLabel}
            </p>
            <p
              className={cn(FIG_SEMI, TITLE, alert ? TITLE_ALERT : TITLE_CALM)}
              dir="auto"
              data-node-id={alert ? '199383:141524' : '199359:126802'}
            >
              {title}
            </p>
          </div>
          {schematic}
        </div>

        {/* device photo — 199383:141545 / 199359:126823. Identical in both
            frames, and neither still draws the old calm node's #e9f0fd disc. */}
        <div
          className="content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 w-[116px]"
          data-node-id={alert ? '199383:141545' : '199359:126823'}
        >
          <div
            className="h-[116px] mix-blend-multiply relative shrink-0 w-[97px]"
            data-name="VMA_Front_5189 2"
            data-node-id={alert ? '199383:141546' : '199359:126824'}
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
          root, which is why the card is `relative`. The alert frame's row is
          23px taller, so the elbow moves with it: 32/121 there, 29/97 in calm. */}
      <div
        className={cn(
          'absolute h-[26px] w-[13px]',
          alert ? 'left-[32px] top-[121px]' : 'left-[29px] top-[97px]',
          PIPE_COLOR,
        )}
        data-node-id={alert ? '199383:141547' : '199359:126825'}
        aria-hidden="true"
      >
        <div className="absolute inset-[0_0_-1.92%_-3.85%]">
          <PipeElbow className="block max-w-none size-full" />
        </div>
      </div>

      {/* footer — 199383:141548 / 199359:126826 when closed; when open the
          toggle moves into the body's own heading, so only the rule stays. */}
      <div
        className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full"
        data-node-id={alert ? '199383:141548' : '199359:126826'}
      >
        <div
          /* The alert frame draws this rule w-full. The calm frame pins it at
             w-[335px], which is the frame's full width — the designer drew it
             edge-to-edge. Taken literally inside this card it would hang out
             past the card's own box and give the page a horizontal scrollbar,
             so 335 is expressed as w-full capped at 335. */
          className={cn('h-0 relative shrink-0 w-full', alert ? null : 'max-w-[335px]')}
          data-node-id={alert ? '199383:141549' : '199359:126827'}
          aria-hidden="true"
        >
          <div className={RULE_FILL} />
        </div>

        {isExpanded ? null : (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={false}
            aria-controls={bodyId}
            className="content-stretch flex items-center justify-center relative shrink-0 w-full cursor-pointer bg-transparent border-0 p-0"
            data-node-id={alert ? '199383:141550' : '199359:126828'}
          >
            <span
              className={cn(FIG_MED, TOGGLE_LABEL)}
              dir="auto"
              data-node-id={alert ? '199383:141551' : '199359:126829'}
            >
              {label}
            </span>
            <span
              className={cn('relative shrink-0 size-[17.36px]', CHEVRON_COLOR)}
              data-name="Tabler Icons / chevron-down"
              data-node-id={alert ? '199383:141552' : '199359:126830'}
            >
              <ChevronDown className="absolute inset-0 block max-w-none size-full" />
            </span>
          </button>
        )}
      </div>

      {/* 199427:138742 — the open body. */}
      {isExpanded ? (
        <div className={BODY} id={bodyId} data-node-id="199427:138742">
          <div className={BODY_HEAD} data-node-id="199427:138743">
            <p className={cn(FIG_SEMI, BODY_TITLE)} dir="auto" data-node-id="199427:138744">
              System status
            </p>
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded
              aria-controls={bodyId}
              className={BODY_TOGGLE}
              data-node-id="199427:138745"
            >
              <span className={cn(FIG_MED, BODY_TOGGLE_TEXT)} dir="auto" data-node-id="199427:138746">
                Show less
              </span>
              <span
                className={cn('relative shrink-0 size-[17.36px]', CHEVRON_COLOR)}
                data-name="Tabler Icons / chevron-up"
                data-node-id="199427:138747"
              >
                <ChevronDown className="absolute inset-0 block max-w-none size-full rotate-180" />
              </span>
            </button>
          </div>

          <div className={ROWS} data-node-id="199427:138748">
            {statusRows.map(row => (
              <div key={row.key} className="contents">
                {/* 199427:138837 / :138849 — a rule above the valve and meter
                    rows, which is where the node separates the device's own
                    state from the unit's. */}
                {row.rule ? (
                  <div className="h-0 relative shrink-0 w-full" aria-hidden="true">
                    <div className={RULE_FILL} />
                  </div>
                ) : null}
                <div className={ROW}>
                  <span className={ROW_LEFT}>
                    {row.glyph === 'dot' ? <StatusDot ok={row.ok} /> : (
                      <span className={ROW_BADGE} aria-hidden="true">
                        {row.glyph === 'device' ? <DeviceGlyph className="block size-[19.749px]" />
                          : row.glyph === 'valve' ? <ValveStatus className="block size-[17.28px]" />
                          : <Gauge className="block size-[17.28px] text-[#62748e]" strokeWidth={1.75} />}
                      </span>
                    )}
                    <span className={cn(FIG_MED, ROW_LABEL)} dir="auto">{row.label}</span>
                  </span>
                  {row.value ? (
                    <span className={cn(ROW_RIGHT, row.icon === 'valve' ? 'gap-[3px]' : null)}>
                      <span className={cn(FIG_MED, ROW_VALUE)} dir="auto">{row.value}</span>
                      <span className="relative shrink-0 size-[17.36px] text-[#45556c]" aria-hidden="true">
                        {row.icon === 'wifi' ? (online ? <Wifi className="block size-full" strokeWidth={1.75} />
                                                      : <WifiOff className="block size-full" strokeWidth={1.75} />)
                          : row.icon === 'valve' ? <ValveStatus className="block size-full" />
                          : <Plug className="block size-full" strokeWidth={1.75} />}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
