/**
 * The loop card, in BOTH of its variants.
 *
 * SOURCE — two nodes, fetched individually rather than as part of their
 * 375x2763 parent frames, which is what finally made this accurate:
 *   collapsed  198629:57165  "Topology/side"  (inside System tab_mobile 198379:80447)
 *   expanded   198736:153302 "Topology"       (inside System page_mobile 198629:63118)
 *
 * Neither parent frame will return a node tree — get_metadata hands back the
 * bare root, indistinguishable from an empty frame. get_design_context with
 * forceCode on the CARD node is the way to get both the code and a render of
 * just that card, and comparing against that render is how the misses below
 * were found. Reading the page-level listing instead is what produced two
 * wrong passes.
 *
 * SHARED SHELL (identical in both)
 *   bg-#fafbfc, white border, radius 18, px-16 py-12, gap-17
 *   inner column gap-11
 *   footer "Close all valves": h-30, w-full, radius 8, px-8, #f2f6ff on a
 *   #0b81f8 border
 *
 * COLLAPSED
 *   header is the title ALONE — no control
 *   a row of tiles at gap-14, each flex-1, h-82, p-6, radius 12 on #f2f6ff
 *   in each tile: the 24px serial badge, the name at 16/24, then power and
 *   connectivity as ICON-ONLY 20px white badges (px-2) — no words
 *   a 41px rule drops from the badge to the valve row, which is pl-20
 *
 * EXPANDED
 *   header gains a "Close" button: h-24, radius 8, px-8, #f2f6ff, caret + 12px
 *   the pipe schematic in a #f2f6ff well: h-112, radius 12, full width
 *   one full-width device card per device, p-9/10, radius 12
 *   in it: serial badge + name + "SN ####", then AC and Connected as WORD
 *   badges (white, h-24, px-8, radius 26) in a 201px column indented pl-20,
 *   the unit photo at 120x144 under mix-blend-multiply in a 201px well, and a
 *   valve row of speed badge + 7.2px rule + state pill + "Close valve"
 *   a 197px rule drops the full height of that column
 *
 * BUTTON SHAPE, because it was wrong twice: component/button/size-xs/radius is
 * 8 and its px is 8. These are rounded RECTANGLES. Built as radius-26 pills,
 * all three buttons on the card read as the wrong component.
 */
import { MemoryStick, Plug, PowerOff, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import PipeTopology from '@/v2/components/PipeTopology'
import ValveStatus from '@/v2/components/ValveStatus'
import vmaFront from '@/assets/wint-vma-front.png'

const VALVE_LABEL = { open: 'Open', closed: 'Closed', error: 'Error' }
const POWER_LABEL = { ac: 'AC', battery: 'Battery', 'ac-lost': 'AC lost' }

/* The node names Geist; this project ships Figtree and falls back to Inter.
   Both are carried so the token resolves the same way it does everywhere else
   in src/v2. */
const FAM_SEMI = String.raw`font-[family-name:var(--font\/family\/sans,'Geist:SemiBold'),'Figtree','Inter',sans-serif]`
const FAM_MED = String.raw`font-[family-name:var(--font\/family\/sans,'Geist:Medium'),'Figtree','Inter',sans-serif]`

const TEXT_TITLE = cn(
  '[word-break:break-word] whitespace-nowrap',
  FAM_SEMI,
  String.raw`font-[number:var(--font\/weight\/font-medium,600)] leading-[var(--text\/base\/lh,24px)] text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/base\/size,16px)]`,
)
const TEXT_NAME = cn(
  '[word-break:break-word] whitespace-nowrap',
  FAM_MED,
  String.raw`font-[number:var(--font\/weight\/font-medium,500)] leading-[var(--text\/base\/lh,24px)] text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/base\/size,16px)]`,
)
const TEXT_SN = cn(
  '[word-break:break-word] whitespace-nowrap font-medium text-[12px]',
  FAM_MED,
  String.raw`leading-[var(--text\/button-xs\/size,12px)] text-[color:var(--colors\/slate\/400,#90a1b9)]`,
)
const TEXT_BADGE = cn(
  '[word-break:break-word] overflow-hidden text-ellipsis whitespace-nowrap text-[12px]',
  FAM_MED,
  String.raw`font-[number:var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)]`,
)
const TEXT_BUTTON = cn(
  '[word-break:break-word] whitespace-nowrap font-medium',
  FAM_MED,
  String.raw`leading-[var(--text\/button-xs\/size,12px)] text-[length:var(--text\/button-xs\/size,12px)]`,
)

/* Radius 8 and px 8 — rounded rects, not pills. The node's drop-shadow is two
   layers that both resolve to rgba(0,0,0,0) at zero blur, i.e. no shadow, so
   they are dropped rather than emitted as a no-op filter. */
const BTN = String.raw`flex shrink-0 items-center justify-center gap-[var(--spacing\/1,4px)] bg-[#f2f6ff] px-[var(--component\/button\/size-xs\/px,8px)] py-[var(--p-0,0px)] rounded-[var(--component\/button\/size-xs\/radius,8px)]`
const BTN_OUTLINE = String.raw`border border-solid border-[var(--wint-blue-accent,#0b81f8)]`
const FOCUS = 'cursor-pointer outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50'

// ── glyphs the node draws, duplicated from TopologyCard.jsx, which does not
// export them. Same PROVENANCE arrangement src/v2/icons/index.js documents for
// glyphs shared with WintSidebarV2 and AlertCard.
const DashboardSpeed02 = (props) => (
  <svg width="15.634" height="14.194" viewBox="0 0 13.0286 11.8286" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <circle cx="6.51429" cy="9.51429" r="1.8" stroke="#62748E" strokeWidth="1.02857" />
    <path d="M6.51429 7.71429V4.71429" stroke="#62748E" strokeWidth="1.02857" strokeLinecap="round" />
    <path d="M12.5143 6.51429C12.5143 3.20058 9.82799 0.514286 6.51429 0.514286C3.20058 0.514286 0.514286 3.20058 0.514286 6.51429" stroke="#62748E" strokeWidth="1.02857" strokeLinecap="round" />
  </svg>
)

const Rule = ({ width }) => (
  <svg width={width} height="1" viewBox={`0 0 ${width} 1`} fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d={`M0 0.5H${width}`} stroke="#CAD5E2" />
  </svg>
)

const PillConnector = () => (
  <svg width="7.2" height="1.2" viewBox="0 0 7.2 1.2" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M0 0.6H7.2" stroke="#CAD5E2" strokeWidth="1.2" />
  </svg>
)

/** The 24px badge that opens both the name row and the valve row. */
function RoundBadge({ children }) {
  return (
    <div className={String.raw`flex size-[24px] shrink-0 items-center justify-center gap-[var(--component\/badge\/gap,4.8px)] overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] rounded-[var(--component\/badge\/radius,31.2px)]`}>
      <div className="flex shrink-0 flex-col items-start">{children}</div>
    </div>
  )
}

/** Collapsed's icon-only status chip — 20px square, px-2, white. */
function IconChip({ children }) {
  return (
    <div className={String.raw`flex size-[20px] shrink-0 items-center justify-center gap-[var(--component\/badge\/gap,4px)] overflow-clip bg-white px-[var(--component\/sheet\/header\/gap,2px)] py-[var(--component\/badge\/py,2px)] rounded-[var(--component\/badge\/radius,26px)] text-[color:var(--colors\/slate\/500,#62748e)]`}>
      <span className="flex size-[12px] shrink-0 items-center justify-center">{children}</span>
    </div>
  )
}

/** Expanded's word badge — h-24, px-8, radius 26, white. */
function WordBadge({ icon, children, tone = 'slate-500' }) {
  return (
    <div className={String.raw`flex h-[24px] shrink-0 items-center justify-center gap-[var(--component\/badge\/gap,4px)] overflow-clip bg-white px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] rounded-[var(--component\/badge\/radius,26px)]`}>
      <span className="flex size-[12px] shrink-0 items-center justify-center text-[color:var(--colors\/slate\/500,#62748e)]">
        {icon}
      </span>
      <p
        className={cn(
          TEXT_BADGE,
          tone === 'slate-600'
            ? String.raw`text-[color:var(--colors\/slate\/600,#45556c)]`
            : String.raw`text-[color:var(--colors\/slate\/500,#62748e)]`,
        )}
      >
        {children}
      </p>
    </div>
  )
}

const powerGlyph = (d) => (d.power === 'ac-lost' ? <PowerOff size={12} /> : <Plug size={12} />)
const commGlyph = (d) => (d.comm === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} />)
const valveText = (d) => (d.valve == null ? 'No valve' : (VALVE_LABEL[d.valve] ?? 'Unknown'))

/** The branch rule: drawn horizontally and rotated, anchored on the badge. */
function BranchRule({ length }) {
  return (
    <div
      aria-hidden="true"
      data-branch-rule={length}
      className="absolute left-[12px] top-[22px] flex w-0 items-center justify-center"
      style={{ height: `${length}px` }}
    >
      <div className="flex-none rotate-90">
        <div className="relative h-0" style={{ width: `${length}px` }}>
          <div className="absolute inset-[-1px_0_0_0]">
            <Rule width={length} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** The valve row both variants end on: speed badge, 7.2px rule, state pill. */
function ValveRow({ device, children }) {
  return (
    <div className="flex shrink-0 items-center pl-[20px]">
      <div className="flex shrink-0 items-end">
        <RoundBadge>
          <div className="relative size-[17.28px] shrink-0 overflow-clip">
            <DashboardSpeed02 />
          </div>
        </RoundBadge>
      </div>
      <div aria-hidden="true" className="relative h-0 w-[7.2px] shrink-0">
        <div className="absolute inset-[-0.6px_0]">
          <PillConnector />
        </div>
      </div>
      <div className="flex shrink-0 items-end gap-[6px]">
        <WordBadge icon={<ValveStatus state={device.valve ?? 'no-valve'} size={12} />} tone="slate-600">
          {valveText(device)}
        </WordBadge>
        {children}
      </div>
    </div>
  )
}

/** COLLAPSED tile — 198629:55327. flex-1, h-82, p-6. */
function CompactTile({ device }) {
  return (
    <div
      data-device-id={device.id}
      className="relative flex h-[82px] min-w-px flex-1 items-start rounded-[12px] bg-[#f2f6ff] p-[6px]"
    >
      <div className="relative flex h-full shrink-0 flex-col items-start justify-between">
        <div className="flex shrink-0 items-center gap-[4px]">
          <div className="flex shrink-0 items-end">
            <RoundBadge>
              <div className="relative size-[19.2px] shrink-0 text-[color:var(--colors\/slate\/500,#62748e)]">
                <MemoryStick size={19} />
              </div>
            </RoundBadge>
          </div>
          <p className={TEXT_NAME}>{device.name}</p>
          {/* Icon ONLY here — the words belong to the expanded variant. */}
          <div className="flex shrink-0 items-center gap-[4px]">
            <IconChip>{powerGlyph(device)}</IconChip>
            <IconChip>{commGlyph(device)}</IconChip>
          </div>
        </div>

        <BranchRule length={41} />
        <ValveRow device={device} />
      </div>
    </div>
  )
}

/** EXPANDED card — 198630:64927. Full width, p-9/10. */
function DeviceCard({ device, onCloseValve }) {
  const canClose = Boolean(onCloseValve) && device.valve === 'open'

  return (
    <div
      data-device-id={device.id}
      className="flex w-full shrink-0 items-center rounded-[12px] bg-[#f2f6ff] px-[9px] py-[10px]"
    >
      <div className="relative flex min-w-px flex-1 flex-col gap-[12px] self-stretch">
        <BranchRule length={197} />

        <div className="flex shrink-0 items-center gap-[4px]">
          <div className="flex shrink-0 items-end">
            <RoundBadge>
              <div className="relative size-[19.2px] shrink-0 text-[color:var(--colors\/slate\/500,#62748e)]">
                <MemoryStick size={19} />
              </div>
            </RoundBadge>
          </div>
          <div className="flex h-full shrink-0 items-center gap-[6px]">
            <p className={TEXT_NAME}>{device.name}</p>
            {device.serial ? (
              <span className="flex h-full items-center justify-center pt-[5px]">
                <p className={TEXT_SN}>SN {device.serial}</p>
              </span>
            ) : null}
          </div>
        </div>

        {/* Words, in a 201px column indented past the rule. */}
        <div className="flex shrink-0 items-center pl-[20px]">
          <div className="flex w-[201px] shrink-0 flex-col items-start">
            <div className="flex shrink-0 items-center gap-[4.8px]">
              <WordBadge icon={powerGlyph(device)}>
                {POWER_LABEL[device.power] ?? 'Not reporting'}
              </WordBadge>
              <WordBadge icon={commGlyph(device)}>
                {device.comm === 'offline' ? 'Offline' : 'Connected'}
              </WordBadge>
            </div>
          </div>
        </div>

        {/* The unit. mix-blend-multiply is the node's: the source has a
            near-white ground and no alpha, which is why it multiplies. */}
        <div className="flex w-full shrink-0 flex-col items-center justify-center">
          <div className="flex w-[201px] shrink-0 items-center justify-center rounded-[8px]">
            <div className="relative h-[144px] w-[120px] shrink-0 mix-blend-multiply">
              <img
                src={vmaFront}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
              />
            </div>
          </div>
        </div>

        <ValveRow device={device}>
          {canClose ? (
            <button
              type="button"
              onClick={() => onCloseValve(device)}
              className={cn(BTN, BTN_OUTLINE, FOCUS, 'h-[24px]')}
            >
              <span className={cn(TEXT_BUTTON, String.raw`text-[color:var(--wint-blue-accent,#0b81f8)]`)}>
                Close valve
              </span>
            </button>
          ) : null}
        </ValveRow>
      </div>
    </div>
  )
}

export default function SystemTopologyCard({
  title = 'Open loop',
  topology = 'open-loop',
  devices = [],
  expanded = false,
  onToggle,
  onCloseValve,
  onCloseAll,
  className,
}) {
  const anyOpen = devices.some((d) => d.valve === 'open')

  return (
    <div
      className={cn(
        String.raw`flex w-full flex-col items-start justify-center gap-[17px] rounded-[var(--rounded-2xl,18px)] border border-solid border-white bg-[#fafbfc] px-[16px] py-[12px]`,
        className,
      )}
      data-node-id={expanded ? '198736:153302' : '198629:57165'}
      data-expanded={expanded ? 'true' : 'false'}
    >
      <div className="flex w-full shrink-0 flex-col items-start gap-[11px]">
        <div className="flex w-full shrink-0 items-center justify-between">
          <p className={TEXT_TITLE}>{title}</p>

          {/* The collapsed node draws NO control, which would leave a card you
              can close and never reopen. The toggle is therefore rendered in
              both states — "Close" with a caret up when open, "Open" with a
              caret down when shut — and only when the host owns that state. */}
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className={cn(BTN, FOCUS, 'h-[24px]')}
            >
              <span className="flex size-[16px] shrink-0 items-center justify-center">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-[16px]">
                  <path
                    d={expanded ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                className={cn(
                  TEXT_BUTTON,
                  String.raw`font-normal text-[color:var(--colors\/slate\/900,#0f172b)]`,
                )}
              >
                {expanded ? 'Close' : 'Open'}
              </span>
            </button>
          ) : null}
        </div>

        {expanded ? (
          <>
            <div className="flex h-[112px] w-full min-w-[112px] max-w-[350px] shrink-0 items-center justify-center rounded-[12px] bg-[#f2f6ff]">
              <PipeTopology topology={topology} valve={anyOpen ? 'open' : 'closed'} />
            </div>
            <div className="flex w-full shrink-0 flex-col items-start">
              <div className="flex w-full shrink-0 flex-col items-start justify-center gap-[14px]">
                {devices.map((d) => (
                  <DeviceCard key={d.id} device={d} onCloseValve={onCloseValve} />
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Collapsed: the tiles sit side by side at gap-14, each flex-1. */
          <div className="flex w-full shrink-0 items-start">
            <div className="flex min-w-px flex-1 items-center gap-[14px]">
              {devices.map((d) => (
                <CompactTile key={d.id} device={d} />
              ))}
            </div>
          </div>
        )}
      </div>

      {onCloseAll ? (
        <button
          type="button"
          onClick={onCloseAll}
          disabled={!anyOpen}
          className={cn(
            BTN,
            BTN_OUTLINE,
            FOCUS,
            'h-[30px] w-full',
            'disabled:cursor-default disabled:opacity-40 disabled:hover:brightness-100',
          )}
        >
          <span className={cn(TEXT_BUTTON, String.raw`text-[color:var(--wint-blue-accent,#0b81f8)]`)}>
            Close all valves
          </span>
        </button>
      ) : null}
    </div>
  )
}
