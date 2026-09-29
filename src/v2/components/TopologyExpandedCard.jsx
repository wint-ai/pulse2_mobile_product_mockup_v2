/**
 * The Open loop card, EXPANDED — "the variant for describing the system".
 *
 * SOURCE: Figma "System page_mobile" 198629:63118, its `Topology` child
 * 198736:153302. The sibling frame "System tab_mobile" 198379:80447 draws the
 * same screen with this card COLLAPSED (compact Supply tiles over a single
 * "Close all valves"), which is what TopologyCard.jsx already renders. The two
 * frames differ in nothing else, so this file is the whole delta between them.
 *
 * Both frames are 375x2763 and neither will return a node tree: get_metadata
 * gives back the bare root, which is indistinguishable from an empty frame.
 * The classes below came from get_design_context with forceCode, which writes
 * the full 211k-character listing to disk instead of refusing.
 *
 * WHAT THE NODE FIXES
 *   root        bg-#fafbfc, white border, gap-17, px-16 py-12, radius 18
 *   header      title 16/24 semibold slate-900, and a "Close" toggle on
 *               #f2f6ff at h-24 / px-10 / radius 26 with a 16px caret
 *   diagram     #f2f6ff, h-112, radius 12, full width — the pipe schematic
 *   device      #f2f6ff, px-9 py-10, radius 12, full width; inside it a 24px
 *               SN badge, the name at 16/24 slate-600, "SN ####" at 12px
 *               slate-400, then AC and Connected badges, the product photo at
 *               120x144 under mix-blend-multiply, and a valve row carrying the
 *               state pill plus a per-device "Close valve"
 *   footer      "Close all valves"
 *
 * The photo is a real asset (VMA_Front_5189 2), imported rather than inlined:
 * SystemsHealthCard's wave is a base64 data URI, but that wave is 1.3k of JPEG
 * and this is a 109KB PNG. Importing lets Vite hash it, serve it under the
 * configured base and keep it out of the JS bundle.
 */
import { MemoryStick, Plug, PowerOff, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import PipeTopology from '@/v2/components/PipeTopology'
import ValveStatus from '@/v2/components/ValveStatus'
import vmaFront from '@/assets/wint-vma-front.png'

/* The card owns the glyph mapping so its host can pass plain data. Putting
   React nodes in a page's data model is how icon choices drift between the two
   screens that show the same device. */
const VALVE_LABEL = { open: 'Open', closed: 'Closed', error: 'Error' }
const POWER_LABEL = { ac: 'AC', battery: 'Battery', 'ac-lost': 'AC lost' }

/* Figtree is the family every string in this node names. Spelled out once
   rather than repeated, because the escape in font-[family-name:var(--font\/…)]
   has to survive into the DOM and is easy to break by editing in place. */
const TEXT_TITLE = String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,600)] leading-[var(--text\/base\/lh,24px)] text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/base\/size,16px)] whitespace-nowrap`
const TEXT_NAME = String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] leading-[var(--text\/base\/lh,24px)] text-[color:var(--colors\/slate\/600,#45556c)] text-[length:var(--text\/base\/size,16px)] whitespace-nowrap`
const TEXT_SN = String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/button-xs\/size,12px)] text-[color:var(--colors\/slate\/400,#90a1b9)] text-[12px] whitespace-nowrap`
const TEXT_BADGE = String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-[number:var(--font\/weight\/font-medium,500)] leading-[var(--text\/xs\/lh,16px)] overflow-hidden text-[12px] text-ellipsis whitespace-nowrap`
const TEXT_BUTTON = String.raw`[word-break:break-word] font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif] font-medium leading-[var(--text\/button-xs\/size,12px)] text-[length:var(--text\/button-xs\/size,12px)] whitespace-nowrap`

/* The node's two button shapes, both h-24 / radius 26 on #f2f6ff. Its
   drop-shadow is two layers that both resolve to rgba(0,0,0,0) at zero blur —
   i.e. no shadow — so they are dropped rather than emitted as a no-op filter. */
const BTN = String.raw`flex h-[24px] shrink-0 items-center justify-center gap-[var(--spacing\/1,4px)] bg-[#f2f6ff] px-[var(--component\/button\/size-xs\/px,10px)] py-[var(--p-0,0px)] rounded-[var(--component\/button\/size-xs\/radius,26px)]`
const BTN_OUTLINE = String.raw`border border-solid border-[var(--wint-blue-accent,#0b81f8)]`

/* Artwork duplicated from TopologyCard.jsx, which does not export it — the
   same PROVENANCE arrangement src/v2/icons/index.js already documents for the
   glyphs shared with WintSidebarV2 and AlertCard. Identical geometry on
   purpose: the collapsed and expanded variants draw the same rules. */
const DashboardSpeed02 = (props) => (
  <svg width="15.634" height="14.194" viewBox="0 0 13.0286 11.8286" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <circle cx="6.51429" cy="9.51429" r="1.8" stroke="#62748E" strokeWidth="1.02857" />
    <path d="M6.51429 7.71429V4.71429" stroke="#62748E" strokeWidth="1.02857" strokeLinecap="round" />
    <path d="M12.5143 6.51429C12.5143 3.20058 9.82799 0.514286 6.51429 0.514286C3.20058 0.514286 0.514286 3.20058 0.514286 6.51429" stroke="#62748E" strokeWidth="1.02857" strokeLinecap="round" />
  </svg>
)

/** The 7.2x1.2 rule between the speed badge and the valve pill. */
const PillConnector = (props) => (
  <svg width="7.2" height="1.2" viewBox="0 0 7.2 1.2" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M0 0.6H7.2" stroke="#CAD5E2" strokeWidth="1.2" />
  </svg>
)

/* The rule dropping from the name row past the badges and the photo to the
   valve row. The node draws it horizontally at 197px and rotates the wrapper
   90deg, anchored left-[12px] — the centre line of the 24px name badge. That
   construction is reproduced rather than replaced by a border, because the
   rotation is what puts its ends where the design has them. */
const BranchConnector = (props) => (
  <svg width="197" height="1" viewBox="0 0 197 1" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
    <path d="M0 0.5H197" stroke="#CAD5E2" />
  </svg>
)

/** 198687:51535 — the 24px speed badge that opens the valve row. */
function SpeedBadge() {
  return (
    <div className={String.raw`flex size-[24px] shrink-0 items-center justify-center gap-[var(--component\/badge\/gap,4.8px)] overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] rounded-[var(--component\/badge\/radius,31.2px)]`}>
      <div className="flex shrink-0 flex-col items-start">
        <div className="flex size-[17.28px] shrink-0 items-center justify-center overflow-clip">
          <DashboardSpeed02 />
        </div>
      </div>
    </div>
  )
}

/** 198736:111920 — the small status badge: h-24, px-8, radius 26. */
function InfoBadge({ icon, children, tone = 'slate-500', white = false }) {
  return (
    <div
      className={cn(
        String.raw`flex h-[24px] shrink-0 items-center justify-center gap-[var(--component\/badge\/gap,4px)] overflow-clip px-[var(--component\/badge\/px,8px)] py-[var(--component\/badge\/py,2px)] rounded-[var(--component\/badge\/radius,26px)]`,
        white && 'bg-white',
      )}
    >
      <span className="flex size-[12px] shrink-0 items-center justify-center">{icon}</span>
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

/**
 * One device — 198630:64927.
 *
 * The node draws two of these and gives both the same serial and the same
 * "Open"; they are a comp's placeholder rows, so everything here is a prop.
 */
function DeviceCard({ device, onCloseValve }) {
  const canClose = Boolean(onCloseValve) && device.valve === 'open'

  return (
    <div
      data-device-id={device.id}
      className="flex w-full shrink-0 items-center rounded-[12px] bg-[#f2f6ff] px-[9px] py-[10px]"
    >
      <div className="relative flex min-w-px flex-1 flex-col gap-[12px] self-stretch">
        {/* 198687:51593 — the rule from the name badge down to the valve row. */}
        <div
          aria-hidden="true"
          className="absolute left-[12px] top-[22px] flex h-[197px] w-0 items-center justify-center"
        >
          <div className="flex-none rotate-90">
            <div className="relative h-0 w-[197px]">
              <div className="absolute inset-[-1px_0_0_0]">
                <BranchConnector />
              </div>
            </div>
          </div>
        </div>

        {/* Name row — the 24px serial badge, the line name, then the serial. */}
        <div className="flex shrink-0 items-center gap-[6px]">
          <div
            aria-hidden="true"
            className={String.raw`flex size-[24px] shrink-0 items-center justify-center gap-[var(--component\/badge\/gap,4.8px)] overflow-clip px-[var(--component\/tabs\/trigger\/gap,7.2px)] py-[var(--component\/badge\/py,2.4px)] rounded-[var(--component\/badge\/radius,31.2px)] text-[color:var(--colors\/slate\/500,#62748e)]`}
          >
            <MemoryStick size={19} />
          </div>
          <p className={TEXT_NAME}>{device.name}</p>
          {device.serial ? (
            <span className="flex h-full items-center justify-center pt-[5px]">
              <p className={TEXT_SN}>SN {device.serial}</p>
            </span>
          ) : null}
        </div>

        {/* 198736:152212 / :152568 — power and connectivity. Both are WHITE
            badges, both indented pl-20 to clear the branch rule, and both sit
            in the same 201px column the photo below uses. The gap is 4.8. */}
        <div className="flex shrink-0 items-center pl-[20px]">
          <div className="flex w-[201px] shrink-0 flex-col items-start">
            <div className="flex shrink-0 items-center gap-[4.8px]">
              <InfoBadge
                white
                icon={device.power === 'ac-lost' ? <PowerOff size={12} /> : <Plug size={12} />}
              >
                {POWER_LABEL[device.power] ?? 'Not reporting'}
              </InfoBadge>
              <InfoBadge
                white
                icon={device.comm === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} />}
              >
                {device.comm === 'offline' ? 'Offline' : 'Connected'}
              </InfoBadge>
            </div>
          </div>
        </div>

        {/* 198687:51529 — the product shot. mix-blend-multiply is the node's:
            the source has a near-white ground and no alpha, which is exactly
            why the design multiplies it onto the #f2f6ff panel. */}
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

        {/* Valve row 198687:51531 — the speed badge, the 7.2px rule, then the
            state pill and the control. The badge and the rule were missing on
            the first pass, which is most of why this did not read as the comp. */}
        <div className="flex shrink-0 items-center">
          <div className="flex shrink-0 items-end rounded-[30px]">
            <SpeedBadge />
          </div>
          <div aria-hidden="true" className="relative h-0 w-[7.2px] shrink-0">
            <div className="absolute inset-[-0.6px_0]">
              <PillConnector />
            </div>
          </div>
          <div className="flex shrink-0 items-end gap-[6px]">
          <InfoBadge
            icon={<ValveStatus state={device.valve ?? 'no-valve'} size={12} />}
            tone="slate-600"
            white
          >
            {device.valve == null ? 'No valve' : (VALVE_LABEL[device.valve] ?? 'Unknown')}
          </InfoBadge>

          {/* Drawn only when the host can act AND the valve is open. A "Close
              valve" on an already-closed valve is the dead control this file's
              siblings already refuse to ship. */}
          {canClose ? (
            <button
              type="button"
              onClick={() => onCloseValve(device)}
              className={cn(
                BTN,
                BTN_OUTLINE,
                'cursor-pointer outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
              )}
            >
              <span
                className={cn(TEXT_BUTTON, String.raw`text-[color:var(--wint-blue-accent,#0b81f8)]`)}
              >
                Close valve
              </span>
            </button>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TopologyExpandedCard({
  title = 'Open loop',
  topology = 'open-loop',
  devices = [],
  onCollapse,
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
      data-node-id="198736:153302"
    >
      <div className="flex w-full shrink-0 flex-col items-start gap-[11px]">
        {/* Header 198629:62729 */}
        <div className="flex w-full shrink-0 items-center justify-between">
          <p className={TEXT_TITLE}>{title}</p>

          {/* The node labels this "Close", with a caret UP: it collapses the
              card back to the compact variant. Rendered only when the host
              owns that state. */}
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              aria-expanded="true"
              className={cn(
                BTN,
                'cursor-pointer outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
              )}
            >
              <span className="flex size-[16px] shrink-0 items-center justify-center">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-[16px]">
                  <path
                    d="M4 10l4-4 4 4"
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
                Close
              </span>
            </button>
          ) : null}
        </div>

        {/* The schematic, in its own #f2f6ff well — Frame2138883601. */}
        <div className="flex h-[112px] w-full min-w-[112px] max-w-[350px] shrink-0 items-center justify-center rounded-[12px] bg-[#f2f6ff]">
          <PipeTopology topology={topology} valve={anyOpen ? 'open' : 'closed'} />
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col items-start justify-center gap-[14px]">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} onCloseValve={onCloseValve} />
        ))}
      </div>

      {/* 198629:62734 — the card-level action, below every device. */}
      {onCloseAll ? (
        <button
          type="button"
          onClick={onCloseAll}
          disabled={!anyOpen}
          className={cn(
            BTN,
            BTN_OUTLINE,
            'w-full cursor-pointer outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
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
