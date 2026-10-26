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
import { ArrowRight, House, PlaneTakeoff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock01, LocationDot } from '@/v2/icons'
import { cn } from '@/lib/utils'

/* The frame names the family as a Figma style ("Figtree:SemiBold"), which is
   not a font the browser can resolve. Carried with the project's own fallback
   chain, same as SystemHeroCard / SystemTopologyCard do. */

/* Card shell 199539:181835. The node is `pb-[18px]` with NO top padding and
   no row gap: the header carries its own py-[6px], the rule sits flush, and
   the body owns pt-[19px]. The old shell was a uniform p-[18px] gap-[19px]
   box, which is why the header could not reach the card's edges. */
const CARD = String.raw`bg-surface-card content-stretch flex flex-col items-start pb-[18px] relative rounded-[18px] shrink-0 w-full overflow-hidden`

const FOCUS = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/* The status pip's tint. The frame ships two exports of the SAME LocationDot
   geometry differing only in fill — #008236 and #FB2C36 — which are stock
   green-700 and red-500 from the shadcn ramp this project draws from, so they
   are utilities here rather than two more frozen hexes. `muted` is ours: the
   frame has no third state, but `autoShutoff` is 'N/A' on the twenty
   metering-only systems and neither green nor red is honest about a setting
   that does not exist on the hardware. */
const STATUS_TONE = {
  on: 'text-green-700',
  off: 'text-red-500',
  muted: 'text-slate-400',
}

/* ── HOME / AWAY ──────────────────────────────────────────────────────────
   RESIDENTIAL ONLY, and that gate is the owner's: "Home away is a simple
   policy for apartmants, depends per systms, make it for ressidential onlt"
   (2026-10-26). An office tower has no "away" in the sense PRD 04e means —
   the building is occupied on a schedule, which is what the Working hours
   policy above already states — so the control is drawn only where it means
   something. SystemPageV2Screen decides by division (l2Name) and simply
   passes no `onModeChange` elsewhere.

   IT IS NOT IN 199539:181835. The frame draws the header, the policy row and
   the two settings rows and stops. The control is kept anyway, on the owner's
   word in the same exchange — "dont remove home away" — and sits BELOW the
   settings rows, which is where the superseded node had it relative to
   everything else on the card. If a later frame places it somewhere specific,
   that frame wins.

   199296:50618 / 199296:50621 — the two halves. Held as String.raw constants
   and swapped whole rather than merged through cn(): twMerge cannot tell
   `border-[length:...]` from `border-[var(...)]` and drops one of them. */
const MODE_BASE = String.raw`content-stretch flex flex-[1_0_0] flex-col h-[42px] items-center justify-center min-w-px pt-1 relative rounded-[9px]`
/* The selected half was a frozen `bg-[#cde6ff]`. Under dark that stayed a
   light blue slab (14.7:1 against the card) with --primary ink on top, which
   inverts to near-white there — the selected mode became the one you could
   not read. --secondary is this repo's pale informational blue and is the
   ground --secondary-foreground (= --primary) is defined against, so the pair
   moves together under every theme. */
const MODE_ON = String.raw`bg-secondary border border-primary border-solid `
const MODE_OFF = String.raw`bg-slate-100 `
const MODE_LABEL = String.raw`[word-break:break-word] font-medium leading-8 relative shrink-0 text-2xl tracking-[-0.6px] whitespace-nowrap`
const MODE_LABEL_ON = String.raw`text-primary`
const MODE_LABEL_OFF = String.raw`text-muted-foreground`

const DEFAULT_POLICIES = [{ id: 'business-hours', name: 'Business Hours', window: '8AM-8PM' }]
/* The frame's own two rows, as the shape reference for a caller that passes
   none. SystemPageV2Screen passes the system's REAL policy — see its call. */
const DEFAULT_SETTINGS = [
  { id: 'alerts', label: 'Alerts', value: 'On', tone: 'on' },
  { id: 'auto-shutoff', label: 'Auto Shutoff Valve', value: 'Off', tone: 'off' },
]

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
  title = 'Active policy',
  policies = DEFAULT_POLICIES,
  settings = DEFAULT_SETTINGS,
  showAllLabel = 'Show all',
  /** Renders the header's "Show all" control. Omit it and no control is drawn. */
  onShowAll,
  /* HOME / AWAY — residential only. The control is drawn only when a caller
     supplies `onModeChange`, so a commercial system passes nothing and gets
     the frame's card exactly. See the constants block above. */
  modeLabel = 'Current Mode',
  learnMoreLabel = 'Learn more',
  mode = 'home',
  modeOptions = DEFAULT_MODE_OPTIONS,
  onModeChange,
  onLearnMore,
  className,
}) {
  const modeLabelId = `${useId()}-mode`
  const explainerId = `${modeLabelId}-explainer`
  /* "Learn more" WAS A DEAD CONTROL — it called `onLearnMore` and no caller
     passed one, so the button rendered, focused and did nothing. A
     chevron-down promises a disclosure; this is one. `onLearnMore` survives
     as an override for a caller that would rather open its own sheet, which
     is what PRD 04e eventually wants. */
  const [explainerOpen, setExplainerOpen] = useState(false)

  /* Roving tabindex: a radiogroup is ONE tab stop and the arrows move the
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
    <div className={cn(CARD, className)} data-node-id="199539:181835" data-name="Active policy">
      {/* ── CardHeader 199532:96292 ──────────────────────────────────────── */}
      <div className="flex w-full shrink-0 items-center gap-[10px] px-[16px] py-[6px]">
        <div className="min-w-px flex-[1_0_0]">
          <div className="flex size-full flex-col items-start gap-[4px] py-[6px]">
            <p
              className="[word-break:break-word] w-full font-sans font-medium text-sm leading-5 text-foreground"
              data-node-id="199532:96295"
            >
              {title}
            </p>
          </div>
        </div>
        {/* 199532:96298 — "Show all" + a lucide arrow-right, which the frame's
            own export IS (the asset's node is literally "Lucide Icons /
            arrow-right"), so this is the real glyph rather than a lookalike.
            A caption with an arrow promises navigation; it is only drawn when
            a caller supplies somewhere to go. */}
        {onShowAll ? (
          <Button
            type="button"
            variant="ghost"
            size={null}
            onClick={onShowAll}
            className={`flex h-[32px] shrink-0 items-center justify-end gap-[6px] rounded-[10px] px-[4px] py-0 font-sans font-medium text-sm leading-5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${FOCUS}`}
            data-node-id="199532:96298"
          >
            {showAllLabel}
            <ArrowRight className="size-[16px] shrink-0" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {/* 199532:96322 — a 1px rule under the header. The node draws it as an
          h-0 box with the line pinned one pixel above, which is a border by
          another name. */}
      <div className="h-px w-full shrink-0 bg-slate-200" data-node-id="199532:96322" />

      {/* ── Body 199532:96319 ────────────────────────────────────────────── */}
      <div className="flex w-full shrink-0 flex-col items-start gap-[19px] px-[16px] pt-[19px]">
        {/* ── POLICY *OR* HOME/AWAY, NEVER BOTH ──────────────────────────
            Owner, 2026-10-26: "they are not working together, Policy or
            Home/Away. Residential is home away."

            These are two answers to ONE question — what rules is this system
            running under — and a card that stacked both asked it twice and
            answered it twice over. A flat on Home means no water is expected
            at all; a Working-hours window means water IS expected between 8
            and 5. Drawn together they contradict each other, and the reader
            has no way to tell which one the valve is actually obeying.

            So the division picks the answer. A residential system IS its
            Home/Away mode and draws nothing else; a commercial one draws its
            schedule and the two settings. `onModeChange` is still the switch,
            because only a caller that can commit a mode change should be
            offered one — see the page, which passes it on l2Name. */}
        {!onModeChange && policies.length ? (
          <div className="flex w-full shrink-0 flex-col items-start gap-[12px]" data-node-id="199532:96142">
            {policies.map((policy, index) => (
              <div
                key={policy.id ?? policy.name ?? index}
                className="flex w-full shrink-0 items-center gap-[6px]"
                data-node-id="199532:96145"
              >
                <div className="relative size-[9px] shrink-0" data-node-id="199532:96146">
                  <PolicyDot color={policy.dotColor} />
                </div>
                <div className="flex min-w-px flex-[1_0_0] items-center justify-between">
                  <p
                    className="[word-break:break-word] font-sans font-semibold text-base leading-6 text-slate-900 whitespace-nowrap"
                    dir="auto"
                    data-node-id="199532:96147"
                  >
                    {policy.name}
                  </p>
                </div>
                {/* 199532:96148 — the window, behind a clock. The glyph only
                    appears with a window to caption; a clock beside nothing
                    would be decoration. */}
                {policy.window ? (
                  <div className="flex shrink-0 items-center gap-[7px]" data-node-id="199532:96148">
                    <Clock01 className="size-[14px] shrink-0 text-slate-600" aria-hidden="true" />
                    <p
                      className="[word-break:break-word] font-sans font-medium text-xs leading-[15px] text-slate-600 whitespace-nowrap"
                      dir="auto"
                      data-node-id="199532:96158"
                    >
                      {policy.window}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── The settings rows — 199532:96187, gap 19 ──────────────────────
            THESE WERE PLAIN CHIPS. The card drew two #e2eafc pills holding the
            bare strings "Alerts" and "Valve handling: Auto shut-off " — a
            label with no value, so the card named two settings and reported
            neither. 199532:96189 / 199532:96194 give each one a slate-100 row
            and a Badge carrying its actual state, which is the whole point of
            a policy summary. */}
        {!onModeChange && settings.length ? (
          <div className="flex w-full shrink-0 flex-col items-start gap-[19px]" data-node-id="199532:96187">
            {settings.map((setting, index) => (
              <div
                key={setting.id ?? setting.label ?? index}
                className="flex w-full shrink-0 items-center justify-between"
              >
                <div
                  className="flex min-w-px flex-[1_0_0] items-center justify-between rounded-[11px] bg-slate-100 px-[13px] py-[9px]"
                  data-node-id={index === 0 ? '199532:96189' : '199532:96194'}
                >
                  <p
                    className="[word-break:break-word] font-sans font-medium text-sm leading-5 text-slate-600 whitespace-nowrap"
                    data-node-id={index === 0 ? '199532:96190' : '199532:96197'}
                  >
                    {setting.label}
                  </p>
                  {setting.value ? (
                    <Badge
                      variant="secondary"
                      className="h-[22px] shrink-0 gap-[4.4px] overflow-clip rounded-[28.6px] border-transparent bg-surface-card px-[6.6px] py-[2.2px]"
                      data-node-id={index === 0 ? '199532:96192' : '199532:96198'}
                    >
                      {/* The SAME LocationDot the sidebar and the health cards
                          draw. The frame's own export is three concentric
                          circles at 0.31579 / 0.5 / 0.10526 of the box with
                          the outer two at 10% — identical geometry, so this is
                          an exact match rather than a substitution, and only
                          the tint differs between the two rows. */}
                      <LocationDot
                        size={14.52}
                        className={cn('shrink-0', STATUS_TONE[setting.tone] ?? STATUS_TONE.muted)}
                      />
                      <span className="overflow-hidden font-sans font-medium text-[13.2px] leading-[17.6px] text-slate-700 text-ellipsis whitespace-nowrap">
                        {setting.value}
                      </span>
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* HOME / AWAY — residential only, and INSTEAD of the two blocks
            above rather than under them. See the note on them. */}
        {onModeChange ? (
          <div className="flex w-full shrink-0 flex-col items-start gap-[14px]">
            <div className="flex w-full shrink-0 items-center justify-between">
              <p
                className="[word-break:break-word] font-sans font-semibold text-sm leading-5 text-muted-foreground whitespace-nowrap"
                id={modeLabelId}
              >
                {modeLabel}
              </p>
              {/* A caret in a frame has no behaviour; this is the only way
                  into the policy explainer, so it is a real button. */}
              <button
                type="button"
                onClick={() => (onLearnMore ? onLearnMore() : setExplainerOpen((v) => !v))}
                aria-expanded={onLearnMore ? undefined : explainerOpen}
                aria-controls={onLearnMore ? undefined : explainerId}
                className={`content-stretch flex cursor-pointer items-center gap-[2px] rounded-[8px] ${FOCUS}`}
              >
                <span className="[word-break:break-word] font-sans font-normal text-[12px] leading-3 text-slate-600 whitespace-nowrap">
                  {learnMoreLabel}
                </span>
                <span
                  className={cn(
                    'relative block size-[17.36px] shrink-0 transition-transform duration-200',
                    !onLearnMore && explainerOpen ? 'rotate-180' : null,
                  )}
                >
                  <ChevronDown1736 />
                </span>
              </button>
            </div>

            <div
              role="radiogroup"
              aria-labelledby={modeLabelId}
              onKeyDown={onModeKeyDown}
              className="content-stretch flex w-full shrink-0 items-start"
            >
              {modeOptions.map((option) => {
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
                  >
                    <span className="content-stretch flex shrink-0 items-center justify-center gap-[8px]">
                      {/* The glyph carries the mode; the fill carries the
                          selection. PRD 04e is explicit that the two modes are
                          "equally valid life states" and must not be split by
                          semantic colour — no green for Home, no blue for Away
                          — so both sides take the SAME treatment and differ
                          only by icon and by which one is filled. */}
                      {option.Icon ? (
                        <option.Icon
                          aria-hidden="true"
                          className={cn(
                            'size-[22px] shrink-0',
                            selected ? MODE_LABEL_ON : MODE_LABEL_OFF,
                          )}
                          strokeWidth={selected ? 2.2 : 1.8}
                        />
                      ) : null}
                      <span
                        className={`${MODE_LABEL} font-sans ${selected ? MODE_LABEL_ON : MODE_LABEL_OFF}`}
                        dir="auto"
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
                you are IN, which is what "Current Mode / Learn more" asks. */}
            {!onLearnMore && explainerOpen ? (
              <p
                id={explainerId}
                className="w-full rounded-[9px] bg-slate-50 px-[12px] py-[10px] font-sans text-[13px] leading-[19px] text-slate-600"
              >
                {(modeOptions.find((o) => o.value === mode) ?? modeOptions[0])?.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
