/**
 * Active policy card — the redesigned System page card, in BOTH of its states.
 *
 * SOURCE — two nodes from the two System page_mobile frames, read from the
 * saved emitted code rather than re-fetched (Figma MCP reads are metered and a
 * rate-limit refusal reads exactly like a missing node):
 *   calm   199296:50268  inside "System page_mobile" 199296:50183
 *   alert  199296:50538  inside "System page_mobile" 199296:50454
 *
 * SHARED between the two states: the card shell, and nothing else.
 *   bg-#fafbfc, radius var(--rounded-2xl,18px), p-18, flex-col gap-19, w-full
 * The title string is the same words in both, but not the same type: calm
 * draws it Regular/400 in slate-700 with no tracking, alert draws it
 * SemiBold/600 in slate-800 at tracking -0.45. So even the title is branched.
 *
 * CALM (199296:50268)
 *   50269  header column, gap-9, Figtree Regular 400
 *     50270  title            18/18   slate-700
 *     50271  description      14/20   gray-700, tracking-normal, wraps
 *   50272  policy list, gap-12
 *     50273 > 50274 > 50275   one row: 9px disc, name, trailing window
 *       50276  Ellipse 1      flat #1a6fe0 disc, inlined (the export is one
 *                             <circle>; an <img> to an expiring URL is not)
 *       50277  name           14/19.25 SemiBold slate-900
 *       50278/50301  window   12/15   Medium slate-500
 *   50338 / 50341  two #e2eafc chips, px-13 py-9 radius 11, 14/20 SemiBold
 *
 * ALERT (199296:50538)
 *   50539  title              18/18 SemiBold slate-800 tracking -0.45
 *   50610  hairline rule      #e2e8f0  (see the width note on it below)
 *   50611  Container, gap-14
 *     50612  "Current Mode" 14/20 SemiBold slate-500  +  "Learn more" 12/12
 *            Regular slate-600 with a 17.36px Tabler chevron-down
 *     50617  Home / Away segmented control, two flex-1 halves, h-42, NO gap
 *       50618  selected   #cde6ff on a 1px --wint-blue-accent border, label
 *                         24/32 tracking -0.6 in the accent
 *       50621  unselected slate-100, no border, label in slate-500
 *       radius on BOTH halves is 9. Not a pill — the frame says 9.
 *
 * The alert state carries no policy rows and no chips; the calm state carries
 * no rule, no mode row and no toggle. `tone` is the only switch.
 *
 * Every emitted class is kept verbatim, escaped var() fallbacks and all. The
 * backslashes only survive in a JSX string attribute or a String.raw template
 * — a plain JS string handed to cn() eats them and the class never lands.
 */

import { useId } from 'react'

import { cn } from '@/lib/utils'

/* The frame names the family as a Figma style ("Figtree:SemiBold"), which is
   not a font the browser can resolve. Carried with the project's own fallback
   chain, same as SystemHeroCard / SystemTopologyCard do. */
const FIG_REG = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Regular'),'Figtree','Inter',sans-serif]`
const FIG_MED = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`
const FIG_SEMI = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif]`

/* Card shell 199296:50268 / 199296:50538 — byte-identical on both nodes. */
const CARD = String.raw`bg-[#fafbfc] content-stretch flex flex-col gap-[19px] items-start p-[18px] relative rounded-[var(--rounded-2xl,18px)] shrink-0 w-full`

/* 199296:50618 / 199296:50621 — the two halves of the mode control. Held as
   String.raw constants and swapped whole rather than merged through cn():
   twMerge cannot tell `border-[length:var(--border-width\/border,1px)]` from
   `border-[var(--wint-blue-accent,#0b81f8)]` and drops one of them. */
const MODE_BASE = String.raw`content-stretch flex flex-[1_0_0] flex-col h-[42px] items-center justify-center min-w-px pt-[var(--component\/input-group\/block\/textarea-top\/pb,4px)] relative rounded-[9px]`
const MODE_ON = String.raw`bg-[#cde6ff] border-[length:var(--border-width\/border,1px)] border-[var(--wint-blue-accent,#0b81f8)] border-solid `
const MODE_OFF = String.raw`bg-[var(--colors\/slate\/100,#f1f5f9)] `
const MODE_LABEL = String.raw`[word-break:break-word] font-[var(--font\/weight\/font-medium,500)] leading-[var(--text\/2xl\/lh,32px)] relative shrink-0 text-[length:var(--text\/2xl\/size,24px)] tracking-[-0.6px] whitespace-nowrap`
const MODE_LABEL_ON = String.raw`text-[color:var(--wint-blue-accent,#0b81f8)]`
const MODE_LABEL_OFF = String.raw`text-[color:var(--colors\/slate\/500,#62748e)]`

const FOCUS = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/* 199296:50338 / 199296:50341 — the two chips are the same node twice over. */
const CHIP = String.raw`bg-[#e2eafc] content-stretch flex flex-col gap-[8px] items-start justify-center px-[13px] py-[9px] relative rounded-[11px] shrink-0 w-full`
const CHIP_TEXT = String.raw`[word-break:break-word] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[color:var(--colors\/slate\/900,#0f172b)] text-[length:var(--text\/sm\/size,14px)] w-full`
/* Figma draws exactly two chips, so only two ids exist. A third would be the
   same node again; it renders without one rather than claiming a false id. */
const CHIP_NODE_IDS = ['199296:50338', '199296:50341']

const DEFAULT_POLICIES = [{ id: 'business-hours', name: 'Business Hours', window: '8AM-8PM' }]
const DEFAULT_CHIPS = ['Alerts', 'Valve handling: Auto shut-off ']
const DEFAULT_MODE_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
]

/* 199296:50276 "Ellipse 1" — the whole exported file is a single filled
   circle, so it is inlined at the exact geometry Figma gave it. */
function PolicyDot({ color = '#1a6fe0' }) {
  return (
    <svg
      className="absolute block inset-0 max-w-none size-full"
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="4.5" cy="4.5" r="4.5" fill={color} />
    </svg>
  )
}

/* 199296:50616 "Tabler Icons / chevron-down" at 17.36px. The stroke is
   #62748e in the export — slate-500, a shade lighter than the slate-600 label
   beside it — so it is carried literally rather than set to currentColor. */
function ChevronDown1736() {
  return (
    <svg
      className="absolute block inset-0 max-w-none size-full"
      width="17.36"
      height="17.36"
      viewBox="0 0 17.36 17.36"
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4.34 6.51L8.68 10.85L13.02 6.51"
        stroke="#62748e"
        strokeWidth="1.085"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ActivePolicyCard({
  tone = 'calm',
  title = 'Active policy',
  description = 'Leak confirmed — flow sustained above threshold',
  policies = DEFAULT_POLICIES,
  chips = DEFAULT_CHIPS,
  modeLabel = 'Current Mode',
  learnMoreLabel = 'Learn more',
  mode = 'home',
  modeOptions = DEFAULT_MODE_OPTIONS,
  onModeChange,
  onLearnMore,
  className,
}) {
  const alert = tone === 'alert'
  const modeLabelId = `${useId()}-mode`

  /* Roving tabindex: a radiogroup is one tab stop and the arrows move the
     selection inside it. */
  const onModeKeyDown = (event) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
    if (!keys.includes(event.key) || modeOptions.length === 0) return
    event.preventDefault()
    const at = Math.max(0, modeOptions.findIndex((option) => option.value === mode))
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    const next = modeOptions[(at + step + modeOptions.length) % modeOptions.length]
    if (next && next.value !== mode) onModeChange?.(next.value)
  }

  return (
    <div className={cn(CARD, className)} data-node-id={alert ? '199296:50538' : '199296:50268'} data-name="Topology">
      {alert ? (
        <p
          className={`[word-break:break-word] ${FIG_SEMI} font-[var(--font\\/weight\\/font-semibold,600)] leading-[var(--text\\/lg\\/lh-none,18px)] relative shrink-0 text-[color:var(--colors\\/slate\\/800,#1d293d)] text-[length:var(--text\\/lg\\/size,18px)] tracking-[-0.45px] whitespace-nowrap`}
          data-node-id="199296:50539"
        >
          {title}
        </p>
      ) : (
        <div
          className={`[word-break:break-word] content-stretch flex flex-col ${FIG_REG} font-[var(--font\\/weight\\/font-normal,400)] gap-[9px] items-start relative shrink-0 w-full`}
          data-node-id="199296:50269"
        >
          <p
            className="leading-[var(--text\/lg\/lh-none,18px)] relative shrink-0 text-[color:var(--colors\/slate\/700,#314158)] text-[length:var(--text\/lg\/size,18px)] whitespace-nowrap"
            data-node-id="199296:50270"
          >
            {title}
          </p>
          {description ? (
            <p
              className="leading-[var(--font\/line-height\/leading-5,20px)] min-w-full relative shrink-0 text-[color:var(--colors\/gray\/700,#364153)] text-[length:var(--font\/size\/text-sm,14px)] tracking-[var(--font\/tracking\/tracking-normal,0px)] w-[min-content]"
              data-node-id="199296:50271"
            >
              {description}
            </p>
          ) : null}
        </div>
      )}

      {alert ? (
        <>
          {/* 199296:50610 — a 1px #e2e8f0 rule. Figma pins it at w-[335px],
              which is wider than this card's 303px content box: the designer
              drew the rules on this board at near-frame width (the sibling
              card's rule, 199296:50511, is the same 335). Taken literally it
              hangs out of the card, so it runs full-bleed-within-padding
              instead. Everything else on the node is verbatim. */}
          <div className="h-0 relative shrink-0 w-full" data-node-id="199296:50610">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg
                className="block max-w-none size-full"
                width="335"
                height="1"
                viewBox="0 0 335 1"
                fill="none"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M0 0.5H335" stroke="#E2E8F0" />
              </svg>
            </div>
          </div>

          <div
            className="content-stretch flex flex-col gap-[14px] items-start relative shrink-0 w-full"
            data-node-id="199296:50611"
            data-name="Container"
          >
            <div
              className="content-stretch flex items-center justify-between relative shrink-0 w-full"
              data-node-id="199296:50612"
              data-name="Paragraph"
            >
              <p
                className={`[word-break:break-word] ${FIG_SEMI} font-semibold leading-[var(--text\\/sm-tight\\/lh,20px)] relative shrink-0 text-[color:var(--colors\\/slate\\/500,#62748e)] text-[length:var(--text\\/sm-tight\\/size,14px)] text-center whitespace-nowrap`}
                data-node-id="199296:50613"
                id={modeLabelId}
              >
                {modeLabel}
              </p>
              {/* A caret in a frame has no behaviour; this is the only way into
                  the policy explainer, so it is a real button. */}
              <button
                type="button"
                onClick={onLearnMore}
                className={`content-stretch flex gap-[2px] items-center relative shrink-0 cursor-pointer rounded-[8px] ${FOCUS}`}
                data-node-id="199296:50614"
              >
                <span
                  className={`[word-break:break-word] ${FIG_REG} font-[var(--font\\/weight\\/font-normal,400)] leading-[var(--text\\/xs\\/lh-none,12px)] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--colors\\/slate\\/600,#45556c)] text-ellipsis whitespace-nowrap`}
                  data-node-id="199296:50615"
                >
                  {learnMoreLabel}
                </span>
                <span
                  className="block relative shrink-0 size-[17.36px]"
                  data-node-id="199296:50616"
                  data-name="Tabler Icons / chevron-down"
                >
                  <ChevronDown1736 />
                </span>
              </button>
            </div>

            <div
              role="radiogroup"
              aria-labelledby={modeLabelId}
              onKeyDown={onModeKeyDown}
              className="content-stretch flex items-start relative shrink-0 w-full"
              data-node-id="199296:50617"
            >
              {modeOptions.map((option, index) => {
                const selected = option.value === mode
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onModeChange?.(option.value)}
                    className={`${selected ? MODE_ON : MODE_OFF}${MODE_BASE} cursor-pointer ${FOCUS}`}
                    data-node-id={index === 0 ? '199296:50618' : index === 1 ? '199296:50621' : undefined}
                    data-name={index === 0 ? 'Heading 2' : index === 1 ? 'Heading 3' : undefined}
                  >
                    <span
                      className="content-stretch flex items-center justify-center relative shrink-0"
                      data-node-id={index === 0 ? '199296:50619' : index === 1 ? '199296:50622' : undefined}
                    >
                      <span
                        className={`${MODE_LABEL} ${FIG_MED} ${selected ? MODE_LABEL_ON : MODE_LABEL_OFF}`}
                        dir="auto"
                        data-node-id={index === 0 ? '199296:50620' : index === 1 ? '199296:50623' : undefined}
                      >
                        {option.label}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full"
            data-node-id="199296:50272"
          >
            {/* The frame draws one row. 50273/50274 are the per-row wrappers
                Figma emitted around it, so the list repeats from 50273 and the
                ids below recur on every row — they are one component instance
                stamped N times, not N distinct nodes. */}
            {policies.map((policy, index) => (
              <div
                key={policy.id ?? policy.name ?? index}
                className="content-stretch flex flex-col items-start relative shrink-0 w-full"
                data-node-id="199296:50273"
              >
                <div
                  className="content-stretch flex flex-col items-start relative shrink-0 w-full"
                  data-node-id="199296:50274"
                >
                  <div
                    className="content-stretch flex gap-[6px] items-center relative shrink-0 w-full"
                    data-node-id="199296:50275"
                  >
                    <div className="relative shrink-0 size-[9px]" data-node-id="199296:50276">
                      <PolicyDot color={policy.dotColor} />
                    </div>
                    <div
                      className="content-stretch flex flex-[1_0_0] items-center justify-between min-w-px relative"
                      data-node-id="199296:50277"
                      data-name="Header"
                    >
                      <div
                        className="content-stretch flex flex-[1_0_0] items-center justify-between min-w-px relative"
                        data-node-id="I199296:50277;198064:50481"
                      >
                        <div
                          className="content-stretch flex items-center relative shrink-0"
                          data-node-id="I199296:50277;198064:50433"
                        >
                          <div
                            className="content-stretch flex gap-[6px] items-center relative shrink-0"
                            data-node-id="I199296:50277;199150:124756"
                          >
                            <p
                              className={`[word-break:break-word] ${FIG_SEMI} font-[var(--font\\/weight\\/font-medium,600)] leading-[var(--text\\/base\\/lh,19.25px)] relative shrink-0 text-[color:var(--colors\\/slate\\/900,#0f172b)] text-[length:var(--text\\/base\\/size,14px)] whitespace-nowrap`}
                              dir="auto"
                              data-node-id="I199296:50277;198064:50427"
                            >
                              {policy.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {policy.window ? (
                      <div
                        className="content-stretch flex gap-[10px] items-center relative shrink-0"
                        data-node-id="199296:50278"
                      >
                        <p
                          className={`[word-break:break-word] ${FIG_MED} font-[var(--font\\/weight\\/font-medium,500)] leading-[var(--text\\/xs\\/lh-tight,15px)] relative shrink-0 text-[color:var(--colors\\/slate\\/500,#62748e)] text-[length:var(--text\\/xs\\/size,12px)] whitespace-nowrap`}
                          data-node-id="199296:50301"
                        >
                          {policy.window}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* The chips are siblings of the policy list on the node, not part of
              a row — they describe the card, so they stay card-level here. */}
          {chips.map((chip, index) => (
            <div key={`${index}-${chip}`} className={CHIP} data-node-id={CHIP_NODE_IDS[index]}>
              <p
                className={`${CHIP_TEXT} ${FIG_SEMI} font-[var(--font\\/weight\\/font-semibold,600)]`}
                dir="auto"
                data-node-id={index === 0 ? '199296:50339' : index === 1 ? '199296:50342' : undefined}
              >
                {chip}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
