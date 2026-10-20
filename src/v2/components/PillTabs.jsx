/**
 * PillTabs — the one pill tab row, shared by the Location page and the System
 * page.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * It replaces two near-copies of the same control:
 *   src/v2/pages/HomeAllAccounts.jsx    function TabTrigger(…)
 *   src/v2/pages/SystemPageV2Screen.jsx function TabTrigger(…)
 * the second of which carried a comment describing itself as "deliberately a
 * near-copy" of the first. The two then drifted — the Location row was
 * restyled on 2026-10-20 and the System row was not — and the owner saw the
 * result as two different colours for the same control and asked why.
 *
 * ── THE PROVENANCE, AND WHY THE TWO ROWS ARE *NOT* TWO DESIGNS ─────────────
 * Four frames in YEmjkKS4xaA827Zm8w3oXx draw this row:
 *   199360:129743   Tabs, Location page — ALERT state   (locA)
 *   199371:137032   Tabs, Location page — CALM  state   (locB)
 *   199383:141512   Tabs, System   page — ALERT state   (sysA)
 *   199394:20601    Tabs, System   page — CALM  state   (sysB)
 * All four are instances of ONE master: the slot id `101485:143349` is common
 * to all four, under Tabs `101485:143347` / TabsTrigger `2761:24879`, which
 * Figma documents as shadcn's Tabs. The fills below are therefore INSTANCE
 * OVERRIDES on a single component, not a designed per-surface variant.
 *
 * Three facts settle that this divergence is an unfinished edit, not intent:
 *
 *  1. Before 2026-10-20 all four frames emitted the SAME pale-blue treatment,
 *     byte for byte. (The saved pre-refetch payloads still show it.) On
 *     2026-10-20 the designer restyled exactly one instance — locA — to a dark
 *     slate pill on card-wash triggers. The other three were left alone.
 *     Re-read live on 2026-10-20: locA is still slate, sysA is still blue.
 *
 *  2. locA and locB are THE SAME SCREEN in its alert and calm states, and they
 *     now disagree with each other. A tab's colour cannot legitimately depend
 *     on whether the location has an open alert, so the Figma file is
 *     self-contradictory here — which rules out "two deliberate treatments".
 *
 *  3. The obvious justification for a difference — that the System page's tabs
 *     sit over the coloured hero wave and need different contrast — is false.
 *     In both sysA and locA the Tabs node is a sibling in the HEADER group,
 *     above `Content`, on the plain root background. The System page's wave
 *     is pinned BELOW the tab row (see the hero note in SystemPageV2Screen).
 *     Both rows sit on the same surface.
 *
 * ── THE OWNER'S RULING, 2026-10-20: PALE BLUE ─────────────────────────────
 * ⚠ READ THIS BEFORE "FIXING" THE COLOUR BACK TO THE NEWEST FIGMA EDIT.
 *
 * The owner was shown the evidence above — that locA is the newest edit and
 * the only deliberate one — and ruled for the OTHER treatment: the pale blue
 * that sysA, sysB and locB still draw, three of the four frames. Both pages
 * therefore pass `tone="blue"` explicitly, and that is the ruled state, not a
 * leftover.
 *
 * This is deliberately NOT what "follow the freshest node" would give you. An
 * agent re-deriving the answer from Figma alone will keep landing on slate,
 * because by provenance alone slate is the better-supported reading — so the
 * ruling is written here rather than left to be rediscovered and overturned.
 * If the colour is to change again it takes the owner's word, not a re-trace.
 *
 * `tone="slate"` is kept whole for that reason, exactly as locA emits it: the
 * Figma file is still self-contradictory (locA and locB are one screen in two
 * states and disagree), the designer may yet settle on slate, and dropping the
 * variant now would only mean re-tracing it later. It is not dead code — it is
 * the other half of a contradiction only the designer can close.
 *
 * The DEFAULT is 'blue' so that a page added later cannot quietly inherit the
 * treatment the owner rejected; both existing call sites still name it anyway,
 * because at the call site the ruled colour should be visible, not implied.
 *
 * ── WHY NOT src/components/ui/tabs.jsx ─────────────────────────────────────
 * That file is the shadcn/Radix tabs, and it does not fit, for two reasons
 * that are not stylistic:
 *   · It draws an UNDERLINE tab (`border-b-2`, `data-[state=active]:border-
 *     primary`) on a transparent list. This design is a filled pill row with
 *     two different radii. Nothing of its styling survives.
 *   · Every class the pill row needs is Figma's own, and they carry escaped
 *     slashes (`text-[color:var(--colors\/slate\/500,#62748e)]`). shadcn
 *     composes through `cn()`, i.e. tailwind-merge, which (a) eats the
 *     backslash so Tailwind reads `/` as an opacity modifier and the class
 *     never reaches the DOM, and (b) treats `leading-*` as conflicting with a
 *     font-size atom and silently drops whichever came first. This repo has
 *     been bitten by both — see the line-height regression fixed in 45fe860
 *     and the nine reverted literals in 33e503b. So the classes are built by
 *     `[…].join(' ')` over String.raw literals, never through `cn()`.
 * What IS taken from the shadcn/Radix contract is the semantics, hand-wired
 * below: role="tablist" / role="tab" / aria-selected, a roving tabindex, and
 * Arrow/Home/End keyboard navigation.
 *
 * ── GEOMETRY NOTES THAT ARE THE NODE'S, NOT A SIMPLIFICATION ───────────────
 *  · GEOMETRY IS PER POSITION, not per state. A trigger carrying a count Badge
 *    is intrinsically wide and the node gives it `shrink-0` while its
 *    neighbours are `flex-[1_0_0]`. Selecting a different tab therefore does
 *    not make it grow. That is the `grow` field on an item.
 *  · SELECTION changes only the fill, the label colour and the focus ring on
 *    the inner content box. It does not change size.
 *  · The `wide` pill (`TabsTrigger/line/false/default`, radius 26) is a
 *    DIFFERENT component from the default pill (radius 14), so the row is not
 *    three copies of one shape. It has no inner content box — its label is a
 *    direct child — which is why the two branches below are not merged.
 *  · The radius fallbacks are 14px / 26px, read from the in-page payloads. A
 *    standalone fetch of the Tabs node answers 8px / 10px because it resolves
 *    without the page's variable mode; the in-page reading is the correct one.
 *  · No `font-[family-name:…]` class is carried. The nodes name Figtree and
 *    the app sets Figtree globally; emitting the class would pin a weight-
 *    suffixed family name ('Figtree:SemiBold') that the app does not register.
 */

import { useRef } from 'react'

/* Figma emits these as raw hex, not `var(--token, …)`, and neither value is
   defined in src/index.css — they are un-tokenised one-offs in the design as
   well as here, so there is no token spelling to prefer. Everything else below
   does resolve to a project token and is written in the var() form the node
   emits: --colors/slate/500 = --slate-500 #62748e, --colors/slate/400 =
   --slate-400 #90a1b9, --colors/slate/200 = --slate-200 #e2e8f0,
   --wint-blue-accent = #0b81f8. #fafbfc is the house card surface and is the
   one sanctioned bare literal. */
const TONES = {
  /* locA 199360:129743 — the designer's newest edit, and NOT the shipped one.
     Kept per the ruling note in the header; do not delete it to tidy up. */
  slate: {
    activeFill: String.raw`bg-[var(--colors\/slate\/500,#62748e)]`,
    activeInk: 'text-[#edf1fc]',
    restFill: 'bg-[#fafbfc]',
    /* I…;121116:90300 carries NO fill class under this tone; the node paints
       the badge with the same two-layer wash the frame root uses, at
       145.43deg, as a raw gradient. Carried verbatim as an inline style
       because that is what Figma emits and there is no utility for it. */
    badgeFill: '',
    badgeStyle: {
      backgroundImage:
        'linear-gradient(145.43317186803606deg, rgba(233, 238, 248, 0.8) 29.24%, rgba(212, 226, 255, 0.8) 12.35%, rgba(228, 235, 250, 0.8) 17.588%, rgba(233, 237, 243, 0.8) 76.864%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
    },
  },
  /* sysA 199383:141512 / sysB 199394:20601 / locB 199371:137032 — three of the
     four frames, and THE TREATMENT THE OWNER RULED FOR on 2026-10-20. This is
     what both pages ship. See the header. */
  blue: {
    activeFill: 'bg-[#c7e3ff]',
    activeInk: String.raw`text-[color:var(--wint-blue-accent,#0b81f8)]`,
    restFill: String.raw`bg-[var(--colors\/slate\/200,#e2e8f0)]`,
    badgeFill: String.raw`bg-[var(--colors\/slate\/200,#e2e8f0)]`,
    badgeStyle: undefined,
  },
}

/** The count Badge — I…;101485:143349;…;121116:90300. */
function CountBadge({ count, label, tone }) {
  return (
    <span
      className={[
        String.raw`content-stretch flex h-[20px] items-center justify-center min-w-[20px] overflow-clip pl-[var(--component\/badge\/px,8px)] pr-[var(--spacing\/2,8px)] py-[var(--component\/badge\/py,2px)] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)] shrink-0`,
        tone.badgeFill,
      ].join(' ')}
      style={tone.badgeStyle}
    >
      {/* The count is decoration on the accessible name: a tab is found by
          what it opens, not by how many things are behind it. Folding the
          number in once renamed "Systems" to "Systems 103", which broke
          systemsTabScope's lookup and would break anyone navigating by name.
          The number is still announced, as the badge's own label. */}
      <span
        className={String.raw`[word-break:break-word] overflow-hidden relative shrink-0 tabular-nums text-[14px] leading-[var(--text\/xs\/lh,20px)] font-[var(--font\/weight\/font-medium,400)] text-[color:var(--colors\/slate\/400,#90a1b9)] text-ellipsis whitespace-nowrap`}
        aria-label={`${count} ${label.toLowerCase()}`}
      >
        {count}
      </span>
    </span>
  )
}

/**
 * One trigger. Not exported: a trigger outside a tablist is not a tab, and
 * every pixel below assumes the row's roving-tabindex bookkeeping.
 */
function TabTrigger({ label, count, active, pill, grow, tone, onSelect, onKeyDown, triggerRef }) {
  const radius =
    pill === 'wide'
      ? String.raw`rounded-[var(--component\/tabs\/list\/radius-horizontal,26px)]`
      : String.raw`rounded-[var(--component\/tabs\/trigger\/radius,14px)]`

  /* The label's `leading-` is spelled AFTER its size on purpose. Figma emits
     its utilities alphabetically, which puts `leading-[…]` first; anything
     that later runs these through tailwind-merge treats leading- as
     conflicting with a font-size atom and silently drops whichever came
     first. Order is meaningless to CSS, so the safe order is this one. */
  const labelClass = [
    '[word-break:break-word] overflow-hidden relative shrink-0 text-[14px] text-center text-ellipsis whitespace-nowrap',
    pill === 'wide'
      ? String.raw`leading-[var(--text\/sm\/lh,20px)]`
      : String.raw`leading-[var(--text\/sm-tight\/lh,20px)]`,
    active
      ? `font-semibold ${tone.activeInk}`
      : pill === 'wide'
        ? String.raw`font-[var(--font\/weight\/font-medium,500)] text-[color:var(--colors\/slate\/500,#62748e)]`
        : String.raw`font-medium text-[color:var(--colors\/slate\/500,#62748e)]`,
  ].join(' ')

  const badge = count != null ? <CountBadge count={count} label={label} tone={tone} /> : null

  return (
    <button
      ref={triggerRef}
      type="button"
      role="tab"
      aria-selected={active}
      /* Roving tabindex, per the WAI-ARIA tabs pattern: the row is ONE tab
         stop and the arrow keys move within it. */
      tabIndex={active ? 0 : -1}
      aria-label={label}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={[
        'content-stretch cursor-pointer flex h-[32px] items-center min-w-[56px] relative',
        grow ? 'flex-[1_0_0]' : 'shrink-0',
        pill === 'wide'
          ? String.raw`gap-[var(--spacing\/2,8px)] justify-center px-[var(--spacing\/2,8px)] py-[var(--spacing\/1,4px)]`
          : active
            ? 'flex-col'
            : 'flex-col justify-center',
        radius,
        /* The nodes draw only ONE selected trigger, the default pill. A
           selected WIDE pill is a state the delivery canvas does not contain,
           so it takes the same fill rule rather than inventing a third. */
        active ? tone.activeFill : tone.restFill,
      ].join(' ')}
    >
      {pill === 'wide' ? (
        <>
          <span className={labelClass}>{label}</span>
          {badge}
        </>
      ) : (
        /* ;121116:90211 (selected) / ;121116:90297 (at rest) — the inner
           content box. The selected one, and only it, carries the focus ring. */
        <span
          className={[
            String.raw`content-stretch flex gap-[var(--component\/tabs\/trigger\/gap,6px)] items-center overflow-clip px-[var(--component\/tabs\/trigger\/px,8px)] py-[var(--component\/tabs\/trigger\/py,4px)] relative shrink-0`,
            radius,
            active ? String.raw`drop-shadow-[0px_0px_0px_var(--ring-focus,rgba(161,161,161,0.5))]` : '',
          ].join(' ')}
        >
          <span className={labelClass}>{label}</span>
          {badge}
        </span>
      )}
    </button>
  )
}

/**
 * The row.
 *
 * @param {object}   props
 * @param {Array}    props.items    `{ id, label, count?, pill?, grow? }[]`.
 *                                  `count` renders the Badge — that is the
 *                                  only difference between the Location row's
 *                                  "Systems 10" and the System row's plain
 *                                  triggers, so it is a prop, not a variant.
 *                                  `pill` is 'default' (radius 14) or 'wide'
 *                                  (radius 26). `grow` defaults true; pass
 *                                  false for a trigger the node draws shrink-0.
 * @param {string}   props.value    id of the selected item.
 * @param {Function} props.onChange called with the id to select.
 * @param {'slate'|'blue'} props.tone  see the header. Default 'blue', which is
 *                                  the treatment the owner ruled for on
 *                                  2026-10-20; 'slate' is locA's newer but
 *                                  un-ruled repaint, kept for the designer.
 * @param {string}   props.nodeId     the page's own Tabs node id, for
 *                                    provenance in the DOM.
 * @param {string}   props.slotNodeId the page's own slot node id.
 */
export default function PillTabs({ items, value, onChange, tone = 'blue', nodeId, slotNodeId }) {
  const palette = TONES[tone] ?? TONES.blue
  const refs = useRef([])

  /* Automatic activation (ArrowLeft/Right select as they move), which is the
     WAI-ARIA pattern's default and the right one here: both panels are already
     rendered client-side, so selecting on arrow costs nothing and saves the
     extra Enter a manual-activation row would need. */
  const handleKeyDown = (index) => (event) => {
    const last = items.length - 1
    let next = null
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    if (next === null) return
    event.preventDefault()
    onChange(items[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div
      className={String.raw`content-stretch flex flex-[1_0_0] gap-[var(--p-0,0px)] h-[36px] items-start min-w-px pr-[var(--component\/tabs\/list\/padding,3px)] py-[var(--component\/tabs\/list\/padding,3px)] relative rounded-[var(--component\/tabs\/trigger\/radius,14px)]`}
      data-node-id={nodeId}
      data-name="Tabs"
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={String.raw`content-stretch flex flex-[1_0_0] gap-[var(--spacing\/2,8px)] items-center min-w-px relative`}
        data-node-id={slotNodeId}
        data-name="slot"
      >
        {items.map((item, index) => (
          <TabTrigger
            key={item.id}
            triggerRef={(node) => {
              refs.current[index] = node
            }}
            label={item.label}
            count={item.count ?? null}
            pill={item.pill ?? 'default'}
            grow={item.grow ?? true}
            active={item.id === value}
            tone={palette}
            onSelect={() => onChange(item.id)}
            onKeyDown={handleKeyDown(index)}
          />
        ))}
      </div>
    </div>
  )
}
