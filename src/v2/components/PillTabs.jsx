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
 * ── RULING 1, 2026-10-20: PALE BLUE — SUPERSEDED, KEPT FOR THE REASONING ──
 * The owner was shown the evidence above — that locA was the newest edit and
 * the only deliberate one — and ruled for the OTHER treatment: the pale blue
 * that sysA, sysB and locB still drew, three of the four frames. Both pages
 * passed `tone="blue"`, and locA's dark-slate repaint was carried whole as
 * `tone="slate"` in case the designer settled there.
 *
 * That ruling is NO LONGER IN FORCE. It is kept here because the reasoning is
 * still the reason this file is trustworthy: the colour of this row is decided
 * by the owner, not by whichever Figma node was edited last, and an agent
 * re-deriving it from Figma alone will keep landing somewhere else.
 *
 * ── RULING 2, 2026-10-21: THE OUTLINED TREATMENT, BOTH PAGES, BOTH STATES ──
 * ⚠ THIS IS THE RULED STATE. Do not "fix" it back to pale blue, and do not
 *   re-derive it from the three frames that still draw pale blue.
 *
 * The designer restyled locA (199360:129743) a second time, to an OUTLINED
 * treatment. Re-read live on 2026-10-21:
 *   199360:129743  locA (Location, ALERT) — NEW outlined treatment
 *   199371:137032  locB (Location, CALM ) — unchanged pale blue
 *   199383:141512  sysA (System,   ALERT) — unchanged pale blue
 *   199394:20601   sysB                   — not refetched
 *
 * So the split described above has not closed: locA still contradicts its own
 * calm state, which is the thing fact 2 says only the designer can settle. The
 * owner was shown exactly that — including the contradiction — and ruled:
 * ADOPT THE OUTLINED TREATMENT ON BOTH PAGES AND BOTH STATES. The three
 * unchanged frames are stale, not a second design.
 *
 * What the outlined treatment is (199360:129737's payload):
 *   · every trigger sits on the house card surface, selected or not
 *   · SELECTION IS A BORDER, not a fill — brand-blue 1px, plus a semibold
 *     brand-blue label where a resting label is medium and muted
 *   · radius is 100px on EVERY trigger, so the old 14px/26px per-pill radius
 *     split collapses; `pill` now only distinguishes STRUCTURE (see below)
 *   · the row is 32px tall, not 36px, and each trigger carries px-[10px]
 *
 * ── THE `tone` PROP IS GONE ───────────────────────────────────────────────
 * Both pages now get one treatment, so `tone="blue"` and `tone="slate"` have
 * nothing left to select between and both are DELETED rather than left to
 * argue for a superseded ruling. They are historical, and the history is the
 * two ruling sections above.
 *
 * Both call sites — src/v2/pages/HomeAllAccounts.jsx and
 * src/v2/pages/SystemPageV2Screen.jsx — passed a dead `tone="blue"` with
 * paragraphs of superseded commentary around it. PHASE 4 REMOVED BOTH and
 * rewrote that prose on the model of this header: ruling 1 kept whole and
 * marked superseded, ruling 2 as what ships. An unknown prop is still inert
 * (not read, no fall-back), and a test pins that so a future call site that
 * passes one does not silently repaint.
 *
 * locA's dark-slate repaint IS dropped with the `slate` tone: it was kept only
 * as the other half of a contradiction, and the owner has now closed the
 * contradiction in the other direction. Its badge wash survives, because the
 * outlined badge uses the identical two-layer gradient — see BADGE_WASH.
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
 *  · SELECTION changes only the border, the label weight and the label colour,
 *    plus the focus ring on the inner content box. It does not change size —
 *    the border is drawn inside the 32px box (Tailwind preflight sets
 *    `box-sizing: border-box`), so a selected trigger is exactly as tall and
 *    as wide as a resting one.
 *  · The `wide` pill (`TabsTrigger/line/false/default`) is still a DIFFERENT
 *    component from the default pill: it has no inner content box — its label
 *    is a direct child — and it carries its own `gap-2 py-1`. That is why the
 *    two branches below are not merged. Under ruling 2 they no longer differ
 *    in RADIUS: both are 100px.
 *  · Under ruling 1 the radius fallbacks were 14px / 26px, read from the
 *    in-page payloads, because a standalone fetch of the Tabs node answers
 *    8px / 10px — it resolves without the page's variable mode. That trap is
 *    still live for any other value read off this node; it just no longer
 *    bites the radius, which ruling 2 fixes at 100px everywhere.
 *  · No `font-[family-name:…]` class is carried. The nodes name Figtree and
 *    the app sets Figtree globally; emitting the class would pin a weight-
 *    suffixed family name ('Figtree:SemiBold') that the app does not register.
 *
 * TOKENS — Phase 3, docs/TOKENIZATION-PLAN.md (2026-10-21). Every
 * `var(--x, #hex)` in this file has been rewritten to the Tailwind utility
 * that paints the same value, and the fallback DELETED. The fallback was a
 * second, invisible source of truth that won whenever the token was missing,
 * with no warning and no visual tell; removing it makes a missing token fail
 * loudly. That pass was pixel-neutral everywhere — each value was resolved per
 * call site against what it already painted.
 *
 * THIS FILE IS THE ONE EXCEPTION, and the change is ruling 2 above, not the
 * token pass: the tab row is deliberately repainted. Ruling 2's values are
 * written as tokens rather than as the node's hexes — bg-surface-card for
 * #fafbfc, border-primary / text-primary for #0b81f8, text-muted-foreground
 * for #62748e, text-slate-400 for #90a1b9 — so the row follows the theme.
 *
 * Any note further down about keeping Figma's escaped `\/` token names
 * VERBATIM, and about String.raw being what carries the backslash, describes
 * the state BEFORE that pass. It is still the rule if an escaped name is ever
 * pasted back in from Figma — but no live class string in this file carries
 * one now, and a fresh paste should resolve the fallback hex to a utility.
 */

import { useRef } from 'react'

/* The badge's wash. I…;121116:90300 carries no fill CLASS — the node paints
   the badge with the same two-layer gradient the frame root uses, at
   145.43deg, as a raw gradient, so it is an inline style and there is no
   utility for it. This is byte-identical to the wash the deleted `slate` tone
   carried, which is why it survived that tone's removal rather than being
   retyped. The stop order is the design's and is not ascending; see the
   --app-bg note in src/index.css for why that is left alone. */
/* The wash, themed. The angle stays here, the colours come from the shipped
   stop list — under `light` that token IS the rgba literal this carried, so
   `light` is byte-identical. NOT var(--chip-bg)/var(--app-bg): those bake one
   angle in at :root and a call-site angle override cannot reach them. See
   WintSidebarV2.jsx for the full note. */
const WASH_BASE = 'linear-gradient(90deg, var(--card) 0%, var(--card) 100%)'

/* Painted as literals, the "Systems 103" badge read as a light sticker on a
   dark bar under `dark` — 4.22:1, and visually wrong rather than merely dim. */
const BADGE_WASH = {
  /* --app-bg-stops: this badge paints the FRAME ROOT's stop set, which is
     what the comment above already says it shares. */
  backgroundImage:
    `linear-gradient(145.43317186803606deg, var(--app-bg-stops)), ${WASH_BASE}`,
}

/* The one radius ruling 2 puts on every trigger. Not a scale step and not a
   token — 100px is the node's own value and it reads as "fully round" at this
   32px height, so it stays an arbitrary length rather than being bent onto
   --radius-*, which is 10px. */
const PILL_RADIUS = 'rounded-[100px]'

/** The count Badge — I…;101485:143349;…;121116:90300. */
function CountBadge({ count, label }) {
  return (
    <span
      className={String.raw`content-stretch flex h-[20px] items-center justify-center min-w-[20px] overflow-clip pl-2 pr-2 py-0.5 relative rounded-md shrink-0`}
      style={BADGE_WASH}
    >
      {/* The count is decoration on the accessible name: a tab is found by
          what it opens, not by how many things are behind it. Folding the
          number in once renamed "Systems" to "Systems 103", which broke
          systemsTabScope's lookup and would break anyone navigating by name.
          The number is still announced, as the badge's own label. */}
      <span
        className={String.raw`[word-break:break-word] overflow-hidden relative shrink-0 tabular-nums font-normal text-slate-400 text-ellipsis whitespace-nowrap text-sm leading-5`}
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
function TabTrigger({ label, count, active, pill, grow, onSelect, onKeyDown, triggerRef }) {
  /* The label's `leading-` is spelled LAST on purpose. Figma emits its
     utilities alphabetically, which puts `leading-…` first; anything that
     later runs these through tailwind-merge treats leading- as conflicting
     with a font-size atom and silently drops whichever came first. Order is
     meaningless to CSS, so the safe order is this one.

     `text-sm` is Tailwind's 14px step and supplies a 20px line-height of its
     own; `leading-5` is the same 20px and is kept explicit because the node
     states it, and because it is what keeps the atom order above meaningful. */
  const labelClass = [
    '[word-break:break-word] overflow-hidden relative shrink-0 text-center text-ellipsis whitespace-nowrap',
    active
      ? String.raw`font-semibold text-primary`
      : String.raw`font-medium text-muted-foreground`,
    'text-sm leading-5',
  ].join(' ')

  const badge = count != null ? <CountBadge count={count} label={label} /> : null

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
        'content-stretch cursor-pointer flex h-[32px] items-center justify-center min-w-[56px] px-2.5 relative',
        grow ? 'flex-[1_0_0]' : 'shrink-0',
        pill === 'wide' ? String.raw`gap-2 py-1` : 'flex-col',
        PILL_RADIUS,
        /* Ruling 2: every trigger sits on the house card surface and selection
           is a 1px brand border, not a fill. bg-surface-card and border-primary
           are tokens, so the row follows the theme — the #fafbfc / #0b81f8
           literals the node emits could not. */
        String.raw`bg-surface-card`,
        /* The nodes draw only ONE selected trigger, the default pill. A
           selected WIDE pill is a state the delivery canvas does not contain,
           so it takes the same selection rule rather than inventing a third. */
        active ? String.raw`border border-primary border-solid` : '',
      ].filter(Boolean).join(' ')}
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
            String.raw`content-stretch flex gap-1.5 items-center overflow-clip px-1.5 py-0.5 relative rounded-md shrink-0`,
            active ? String.raw`drop-shadow-[0px_0px_0px_rgba(161,161,161,0.5)]` : '',
          ].filter(Boolean).join(' ')}
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
 *                                  `pill` is 'default' or 'wide'. Under ruling
 *                                  2 both draw the same 100px radius; 'wide'
 *                                  still differs structurally — no inner
 *                                  content box, and its own gap-2 py-1.
 *                                  `grow` defaults true; pass false for a
 *                                  trigger the node draws shrink-0.
 * @param {string}   props.value    id of the selected item.
 * @param {Function} props.onChange called with the id to select.
 * @param {string}   props.nodeId     the page's own Tabs node id, for
 *                                    provenance in the DOM.
 * @param {string}   props.slotNodeId the page's own slot node id.
 *
 * NOTE: there is no `tone` prop any more — ruling 2 gives both pages one
 * treatment. Phase 4 removed the leftover `tone="blue"` from both call sites,
 * so nothing passes it today. An unknown prop stays inert rather than falling
 * back to a treatment nobody ruled for, and there is a test pinning that.
 */
export default function PillTabs({ items, value, onChange, nodeId, slotNodeId }) {
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
      /* Ruling 2 drops the row from 36px to 32px, and the node gives the row
         itself no radius — it has no fill, so there is nothing for a radius to
         clip and the old `rounded-xl` here was inert. */
      className={String.raw`content-stretch flex flex-[1_0_0] gap-0 h-[32px] items-start min-w-px pr-[3px] py-[3px] relative`}
      data-node-id={nodeId}
      data-name="Tabs"
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={String.raw`content-stretch flex flex-[1_0_0] gap-2 items-center min-w-px relative`}
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
            onSelect={() => onChange(item.id)}
            onKeyDown={handleKeyDown(index)}
          />
        ))}
      </div>
    </div>
  )
}
