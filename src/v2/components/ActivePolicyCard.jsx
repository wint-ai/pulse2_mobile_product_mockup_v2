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
 *
 * ── RE-READ against the two NEWER System page_mobile frames ──────────────────
 * Again from saved emitted code, never a live Figma read:
 *   199383:141499  the ALERT frame  (this card: 199383:141576, data-name
 *                  "Topology", the same shell name as 199296:50268/50538)
 *   199359:126785  the CALM frame   (this card: 199359:126854)
 *
 * WHAT IS ALREADY A MATCH — the calm branch below is byte-identical to the calm
 * frame 199359:126854, shell and all: bg-#fafbfc / rounded-2xl 18 / p-18 /
 * gap-19; the 9px disc + "Business Hours" (Figtree SemiBold 14/19.25 slate-900,
 * through the same 198064:50481 › 198064:50433 › 199150:124756 › 198064:50427
 * instance chain) + "8AM-8PM" (Figtree Medium 12/15 slate-500); both chips
 * bg-#e2eafc, px-13 py-9, rounded-11, 14/20 SemiBold slate-900 w-full. Nothing
 * there needed changing. Only `dir="auto"` was missing from the description
 * (199359:126857 carries it) and is now restored.
 *
 * WHERE THE TWO NEW FRAMES DISAGREE — reported, not silently resolved:
 *   title    199383:141578 is Figtree Regular/400, leading text/lg/lh-none 18,
 *            slate-700, text/lg/size 18 — i.e. exactly what this file already
 *            draws for calm. 199359:126856 instead draws it Figtree Medium/500,
 *            leading text/sm/lh 20, --foreground #0a0a0a, text/sm/size 14.
 *            The alert frame is the later node and agrees with this file, so
 *            the type is left alone.
 *   descr.   the calm frame keeps it ("Current active policy"); the alert frame
 *            drops the description row entirely. It is a prop with a default,
 *            so it stays and the caller decides.
 *   chips    calm frame: both chips bg-#e2eafc, each a single SemiBold string
 *            ("Alerts", "Valve handling: Auto shut-off "). Alert frame:
 *            bg-[var(--colors\/slate\/100,#f1f5f9)] on both, and the second
 *            chip is a flex ROW of two runs — "Valve handling" in Figtree
 *            Medium slate-600 (#45556c) then "Auto shut-off " in Figtree
 *            SemiBold slate-900, gap-8, items-center, whitespace-nowrap
 *            (199383:141627 / 141628 / 142573). This branch draws chips only
 *            in CALM, where the calm frame already matches, so neither the
 *            slate-100 fill nor the split row has a place to land yet.
 *
 * NOT IMPLEMENTED — the alert state was redesigned out from under this file:
 * 199383:141576 draws the ALERT card as the calm card (title + policy rows +
 * two slate-100 chips) and carries NO hairline rule, NO "Current Mode" row, NO
 * "Learn more" caret and NO Home/Away segmented control. Neither new frame
 * contains the strings "Current Mode", "Home", "Away" or "Learn more", or the
 * #cde6ff selected fill. Following it literally would delete the radiogroup,
 * its roving-tabindex keyboard handling, `onModeChange` and `onLearnMore` —
 * working functionality this repo does not drop without the owner saying so —
 * and any blend of the old and new alert cards would be an invented layout
 * (there is no frame that shows rows, chips, rule and toggle together). So the
 * alert branch is left exactly as 199296:50538 drew it, and this is flagged for
 * the owner instead.
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

import { useId, useState } from 'react'
import { House, PlaneTakeoff } from 'lucide-react'

import { cn } from '@/lib/utils'

/* The frame names the family as a Figma style ("Figtree:SemiBold"), which is
   not a font the browser can resolve. Carried with the project's own fallback
   chain, same as SystemHeroCard / SystemTopologyCard do. */

/* Card shell 199296:50268 / 199296:50538 — byte-identical on both nodes. */
const CARD = String.raw`bg-surface-card content-stretch flex flex-col gap-[19px] items-start p-[18px] relative rounded-[18px] shrink-0 w-full`

/* 199296:50618 / 199296:50621 — the two halves of the mode control. Held as
   String.raw constants and swapped whole rather than merged through cn():
   twMerge cannot tell `border-[length:var(--border-width\/border,1px)]` from
   `border-[var(--wint-blue-accent,#0b81f8)]` and drops one of them. */
const MODE_BASE = String.raw`content-stretch flex flex-[1_0_0] flex-col h-[42px] items-center justify-center min-w-px pt-1 relative rounded-[9px]`
const MODE_ON = String.raw`bg-[#cde6ff] border border-primary border-solid `
const MODE_OFF = String.raw`bg-slate-100 `
const MODE_LABEL = String.raw`[word-break:break-word] font-medium leading-8 relative shrink-0 text-2xl tracking-[-0.6px] whitespace-nowrap`
const MODE_LABEL_ON = String.raw`text-primary`
const MODE_LABEL_OFF = String.raw`text-muted-foreground`

const FOCUS = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/* 199296:50338 / 199296:50341 — the two chips are the same node twice over. */
const CHIP = String.raw`bg-[#e2eafc] content-stretch flex flex-col gap-[8px] items-start justify-center px-[13px] py-[9px] relative rounded-[11px] shrink-0 w-full`
const CHIP_TEXT = String.raw`[word-break:break-word] leading-5 relative shrink-0 text-foreground text-sm w-full`
/* Figma draws exactly two chips, so only two ids exist. A third would be the
   same node again; it renders without one rather than claiming a false id. */
const CHIP_NODE_IDS = ['199296:50338', '199296:50341']

const DEFAULT_POLICIES = [{ id: 'business-hours', name: 'Business Hours', window: '8AM-8PM' }]
const DEFAULT_CHIPS = ['Alerts', 'Valve handling: Auto shut-off ']
/* ICONS AND COPY COME FROM THE PRD, not from taste.
   docs/PRD/04e-home-away.md in the sandbox repo, locked 2026-06-08 round 6:

     Iconography   Home = `home`, Away = `flight_takeoff`
     H7            "Away icon = flight_takeoff (airplane). Was `luggage` in
                    the first draft."

   So Away is a plane, not a suitcase — that choice was made and reversed
   once already. Material Symbols there, lucide here, which is what shadcn
   draws with: House and PlaneTakeoff are the same two marks. House is also
   what TabBar uses for Home, so one concept keeps one glyph.

   The description is the PRD's locked copy, verbatim, both sentences — what
   water use is expected, and what the valve will do. "No jargon (no
   'auto-shutoff', no 'policy'). Plain consequence-language." */
const DEFAULT_MODE_OPTIONS = [
  {
    value: 'home',
    label: 'Home',
    Icon: House,
    description:
      "Water consumption is expected, like a normal day. If a water event is detected, you'll be alerted but the valve will stay open.",
  },
  {
    value: 'away',
    label: 'Away',
    Icon: PlaneTakeoff,
    description:
      "No water consumption is expected while you're away. If a water event is detected, you'll be alerted and the valve will be closed automatically.",
  },
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
      className="absolute block inset-0 max-w-none size-full text-slate-500"
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
        stroke="currentColor"
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

  /* "Learn more" WAS A DEAD CONTROL. It called `onLearnMore`, and no caller
     passed one — SystemPageV2Screen mounts this card with `policies`, `mode`
     and `onModeChange` and nothing else — so the button rendered, focused,
     and did nothing. A chevron-down promises a disclosure; this is now one.
     `onLearnMore` is kept as an override for a caller that would rather open
     its own sheet, which is what PRD 04e eventually wants. */
  const [explainerOpen, setExplainerOpen] = useState(false)
  const explainerId = `${modeLabelId}-explainer`

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
          className={`[word-break:break-word] font-sans font-semibold leading-[18px] relative shrink-0 text-slate-800 text-lg tracking-[-0.45px] whitespace-nowrap`}
          data-node-id="199296:50539"
        >
          {title}
        </p>
      ) : (
        <div
          className={`[word-break:break-word] content-stretch flex flex-col font-sans font-normal gap-[9px] items-start relative shrink-0 w-full`}
          data-node-id="199296:50269"
        >
          <p
            className="leading-[18px] relative shrink-0 text-slate-700 text-lg whitespace-nowrap"
            data-node-id="199296:50270"
          >
            {title}
          </p>
          {description ? (
            <p
              className="leading-5 min-w-full relative shrink-0 text-gray-700 text-sm tracking-normal w-[min-content]"
              dir="auto"
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
                className="block max-w-none size-full text-slate-200"
                width="335"
                height="1"
                viewBox="0 0 335 1"
                fill="none"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M0 0.5H335" stroke="currentColor" />
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
                className={`[word-break:break-word] font-sans font-semibold leading-5 relative shrink-0 text-muted-foreground text-sm text-center whitespace-nowrap`}
                data-node-id="199296:50613"
                id={modeLabelId}
              >
                {modeLabel}
              </p>
              {/* A caret in a frame has no behaviour; this is the only way into
                  the policy explainer, so it is a real button. */}
              <button
                type="button"
                onClick={() => (onLearnMore ? onLearnMore() : setExplainerOpen(v => !v))}
                aria-expanded={onLearnMore ? undefined : explainerOpen}
                aria-controls={onLearnMore ? undefined : explainerId}
                className={`content-stretch flex gap-[2px] items-center relative shrink-0 cursor-pointer rounded-[8px] ${FOCUS}`}
                data-node-id="199296:50614"
              >
                <span
                  className={`[word-break:break-word] font-sans font-normal leading-3 overflow-hidden relative shrink-0 text-[12px] text-slate-600 text-ellipsis whitespace-nowrap`}
                  data-node-id="199296:50615"
                >
                  {learnMoreLabel}
                </span>
                <span
                  className={cn(
                    'block relative shrink-0 size-[17.36px] transition-transform duration-200',
                    !onLearnMore && explainerOpen ? 'rotate-180' : null,
                  )}
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
                      className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0"
                      data-node-id={index === 0 ? '199296:50619' : index === 1 ? '199296:50622' : undefined}
                    >
                      {/* The glyph carries the mode; the fill carries the
                          selection. PRD 04e is explicit that the two modes are
                          "equally valid life states" and must not be split by
                          semantic colour — no green for Home, no blue for Away
                          — so both sides take the SAME treatment and differ
                          only by icon and by which one is filled. The frame's
                          selected fill is mode-independent, so it satisfies
                          that rule as drawn. */}
                      {option.Icon ? (
                        <option.Icon
                          aria-hidden="true"
                          className={cn('shrink-0 size-[22px]', selected ? MODE_LABEL_ON : MODE_LABEL_OFF)}
                          strokeWidth={selected ? 2.2 : 1.8}
                        />
                      ) : null}
                      <span
                        className={`${MODE_LABEL} font-sans ${selected ? MODE_LABEL_ON : MODE_LABEL_OFF}`}
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

            {/* PRD 04e's locked mode description, both sentences: what use is
                expected, then what the valve will do. It describes the mode
                you are IN, which is what "Current mode · Learn more" asks. */}
            {!onLearnMore && explainerOpen ? (
              <p
                id={explainerId}
                className="w-full rounded-[9px] bg-slate-50 px-[12px] py-[10px] font-sans text-[13px] leading-[19px] text-slate-600"
              >
                {(modeOptions.find(o => o.value === mode) ?? modeOptions[0])?.description}
              </p>
            ) : null}
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
                              className={`[word-break:break-word] font-sans font-semibold leading-[19.25px] relative shrink-0 text-foreground text-sm whitespace-nowrap`}
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
                          className={`[word-break:break-word] font-sans font-medium leading-[15px] relative shrink-0 text-muted-foreground text-xs whitespace-nowrap`}
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
                className={`${CHIP_TEXT} font-sans font-semibold`}
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
