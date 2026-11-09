/**
 * MoreMenu — the floating menu the header's `More ☰` badge opens.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Owner, 2026-11-07, on the System and Location screens:
 *
 *   "we are replacing tabs with the more button"
 *   "needs to open as a floating component like in ios- check for best
 *    practices how to do that"
 *
 * So the segmented `PillTabs` row disappears from both pages and its
 * destinations move in here. This is a change of CONTROL, not of destination:
 * the ids stay `overview` / `systems` / `general` (moreMenuModel.js says why),
 * and picking `General Info` must swap the body to the same view the tab
 * swapped to.
 *
 * ── THE FRAME ARRIVED, 2026-11-08 ────────────────────────────────────────
 * This used to say "No Figma frame in this set draws the menu open, so its
 * CONTENTS are derived rather than transcribed." That is no longer true.
 * `200047:135363` — the `SelectContent` instance, 204x165, right-aligned under
 * the More badge — draws it. `get_design_context` on that node is in the shared
 * cache, so re-deriving any of this costs no Figma call.
 *
 * WHAT THE FRAME CHANGED HERE: a heading row (`Select preview`), a LEADING
 * 16px icon on every row where the gutter used to be the checkmark's, the tick
 * moved to the TRAILING edge, a count badge in place of a bare number, and the
 * chassis (204 wide, 18px radius, slate-100 + `--primary` on the row in
 * effect). Points 6 and 8 below were written when no frame existed and are
 * marked where the frame has since overruled them.
 *
 * WHAT IT DID NOT CHANGE: the three row labels. The frame says `Locations`
 * where this ships `Systems`, and `General info` where this ships
 * `General Info`; both renames are pinned by suites this change does not own
 * and the `Locations` one would misdescribe what the row opens. moreMenuModel.js
 * carries the evidence. The labels are still strings the tab row already ships
 * — nothing in this menu except the heading was authored for it.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE iOS PATTERN — WHAT WAS TAKEN, AND WHAT WAS REJECTED
 * ═══════════════════════════════════════════════════════════════════════════
 * Read before changing anything below. Sources are Apple's Human Interface
 * Guidelines (Menus, Context menus, Popovers, Materials, all read 2026-11-07)
 * and UIKit's `UIMenu` / `UIButton.showsMenuAsPrimaryAction`. The control this
 * imitates is a UIKit button menu — a `More` button with
 * `showsMenuAsPrimaryAction = true` and a `UIMenu` whose children are
 * `UIAction`s — NOT a `UIPopoverPresentationController`.
 *
 * ── TAKEN ─────────────────────────────────────────────────────────────────
 *
 *  1. ANCHORED TO THE CONTROL THAT REVEALED IT, opening downward from it.
 *     HIG, Popovers: "Make sure a popover's arrow points as directly as
 *     possible to the element that revealed it." HIG, Menus (visionOS, but the
 *     only place it is spelled out): "Prefer displaying a menu near the
 *     content it controls" — illustrated with a `More` button and "A menu
 *     containing a list of actions is displayed beneath the button."
 *     Here: measured off the real badge at open time. See THE ANCHOR.
 *
 *  2. SCALE-OUT-OF-THE-CONTROL MOTION. `transform-origin` is the badge's own
 *     corner, so the card grows from the thing that was pressed rather than
 *     appearing beside it. 170ms, cubic-bezier(0.32, 0.72, 0, 1) — the curve
 *     this repo already uses for its one other iOS-feeling transition
 *     (EventsScreen.jsx:433, the alerts slide-in).
 *
 *  3. THE DIM BEHIND IT. HIG, Context menus: "the system animates the preview
 *     image as it emerges from the content, dimming the screen behind the
 *     preview and the menu." Here: `bg-scrim`, the repo's own four-theme
 *     scrim token, plus `backdrop-blur-[2px]` — which is free (App.jsx:674
 *     already pairs exactly those two) and is the half of HIG Materials that
 *     applies: "The regular variant blurs and adjusts the luminosity of
 *     background content to maintain legibility of text."
 *
 *  4. DISMISS ON TAP-OUTSIDE AND ON PICK. HIG, Popovers: "a popover generally
 *     closes when people click or tap outside its bounds or select an item in
 *     the popover." Plus Escape and route change — see DISMISSAL.
 *
 *  5. SEPARATORS MARK GROUPS, NOT ROWS. HIG, Context menus: "you can use
 *     separators to group items in a context menu and help people scan the
 *     menu more quickly. In general, you don't want more than about three
 *     groups." That is `UIMenu(options: .displayInline)` in UIKit, and it is
 *     the `separatorBefore` flag on an item here. Today's two lists use no
 *     groups at all; the prop stays because the orphaned `/more` destinations
 *     may arrive as a second one.
 *
 *  6. A CHECKMARK ON THE ITEM IN EFFECT. HIG, Menus, Toggled items: "Consider
 *     using a checkmark to show that an attribute is currently in effect".
 *     That is `UIMenuElement.State.on`.
 *     ⚠ OVERRULED IN PART BY THE FRAME, 2026-11-08 — THE EDGE. HIG
 *     illustrates this as "a checkmark icon on the leading edge of the second
 *     item", and that is where this put it until the frame drew the tick on
 *     the TRAILING edge and gave the leading gutter to a per-row icon. The
 *     frame is the design and wins; HIG is what was followed in its absence.
 *     A gutter is still reserved on every row so labels stay aligned — it is
 *     now the ICON's gutter. See THE LEADING SLOT in the row markup.
 *
 *  7. ROWS AT OR OVER 44px, Apple's minimum target. The number lives in
 *     moreMenuModel.js so a test can hold this file to it.
 *
 *  8. ICONS SPARINGLY, AND UNIFORM WITHIN A GROUP. HIG, Menus: "Use menu item
 *     icons sparingly and with purpose... Don't display an icon if you can't
 *     find one that clearly represents the menu item", and "provide icons for
 *     all menu items in a group, or none of them."
 *     ⚠ SATISFIED IN THE OTHER DIRECTION SINCE 2026-11-08. This used to read
 *     "today nothing passes one, because none of Overview / Systems / General
 *     Info has a glyph that clearly means it" — that was the honest reading of
 *     "none of them" while no frame existed. The frame picks all three
 *     (dashboard-square-02 / location-06 / an information circle), so the rule
 *     is now met by every row having one rather than no row having one. The
 *     obligation on a future group is unchanged: all of its rows, or none.
 *
 *  9. A SHORT MENU, IMPORTANT ITEMS FIRST. HIG: "Aim for a small number of
 *     menu items"; "Prefer listing important or frequently used menu items
 *     first." The order is the tab row's existing order, which already encodes
 *     the owner's priority — so it is kept rather than re-derived.
 *
 * ── REJECTED ──────────────────────────────────────────────────────────────
 *
 *  A. TITLE-STYLE CAPITALIZATION. HIG, Menus: "To be consistent with platform
 *     experiences, use title-style capitalization." REJECTED. This repo's copy
 *     standard (.claude/skills/wint-ui-copy §3b, Microsoft Writing Style
 *     Guide) is sentence case, and more decisively: all three labels are
 *     strings the tab row ALREADY SHIPS. Recapitalising them would be
 *     authoring copy, and `systemsTabScope.dom.test.jsx` navigates by them.
 *     Apple's house style does not outrank the product's.
 *
 *  B. THE POPOVER BEAK. HIG, Popovers, is the only place Apple says the thing
 *     should point at its source. REJECTED because this is not a popover: a
 *     `UIMenu` on a button has no beak, and has not had one since iOS 14. The
 *     transform origin does the pointing instead, which is what the system
 *     control actually does.
 *
 *  C. "AVOID DISPLAYING POPOVERS IN COMPACT VIEWS... use all available screen
 *     space by presenting information in a full-screen modal view like a sheet
 *     instead." (HIG, Popovers, iOS/iPadOS.) REJECTED, and recorded because
 *     the next person to read that page will think this control is wrong. It
 *     governs POPOVERS. A button menu is the compact-width idiom — it is what
 *     iOS itself puts behind every `More ⋯` button on an iPhone — and the
 *     owner asked for "a floating component like in ios", explicitly not a
 *     sheet. This repo already has four bottom sheets; it did not need a
 *     fifth.
 *
 *  D. A TRANSLUCENT / Liquid Glass CARD. HIG, Materials: menus sit on a
 *     blurred material. REJECTED for the card itself. `backdrop-filter` on the
 *     card would pull the page's colour up through the labels, and this app
 *     has four themes that set `--popover` deliberately — `contrast` sets it
 *     to a loud red on purpose, which a translucent card would wash out. The
 *     blur stays on the scrim, where it costs nothing and reads the same way.
 *
 *  E. AN EXIT ANIMATION. iOS animates the dismissal as well as the open.
 *     REJECTED: keeping the card mounted for the ~150ms of an exit transition
 *     means the menu's rows are in the DOM while the menu is shut. This
 *     project has a four-time history of a menu row's accessible name being
 *     found by the wrong query at the wrong moment. Correctness of what is in
 *     the DOM beats the polish. Open animates; close unmounts on the spot.
 *
 *  F. `role="menuitemradio"` + `aria-checked`. Strictly the better ARIA for a
 *     single-selection list, and what `UIMenu(options: .singleSelection)` maps
 *     to. REJECTED: the shared contract four agents are coding against says
 *     `role="menu"` / `role="menuitem"`, and `getByRole('menuitem')` does NOT
 *     match `menuitemradio`. The selected state is carried by
 *     `aria-current="true"` instead, which is valid on any role, is announced,
 *     and keeps the colour-plus-glyph checkmark from being the only cue.
 *
 *  G. AN ELLIPSIS ON A LABEL THAT OPENS A FURTHER VIEW. HIG, Menus: "Append an
 *     ellipsis to a menu item's label when the action requires more
 *     information before it can complete." REJECTED while nothing in the menu
 *     does that. If the orphaned `/more` destinations land here, re-read this
 *     — and note that any label that is also an accessible-name contract
 *     cannot take one.
 *
 *  H. SUBMENUS, and the small/medium menu layouts. Two to four rows; nothing
 *     to nest. The small and medium layouts need icon-only rows, and a glyph
 *     with no word is exactly the "colour is never the only cue" failure the
 *     copy standard forbids.
 *
 *  I. DESTRUCTIVE STYLING. HIG puts data-destroying items last, in red.
 *     Nothing in this menu destroys anything, and red is reserved in this repo
 *     for shut-off. No red.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── IT IS `absolute inset-0`, AND IT MAY NEVER BE A RADIX PORTAL ──────────
 * `DropdownMenu`, `Popover`, `Select`, `Dialog`, `Sheet` and `Tooltip` all
 * render through a portal to `document.body`, and this app draws inside a
 * fixed 393x852 frame with `overflow: hidden` (src/components/Phone.jsx). A
 * portal escapes that frame BY DESIGN and renders across the whole browser
 * window with the phone sitting in the middle of it. This repo has hit it at
 * least three times; the prohibition is written out at AccountScreenV2.jsx
 * (search WHY NOT A DROPDOWN) and ValveConfirmSheet.jsx:17-24, and every
 * overlay in this app is an `absolute inset-0` layer instead. Radix
 * `Separator`, `Checkbox`, `Tabs`, `Label`, `ScrollArea`, `RadioGroup`,
 * `Collapsible` and `Accordion` do NOT portal and are safe — `Separator` is
 * used below for exactly that reason.
 *
 * ── z-50, AND WHY THAT NUMBER ─────────────────────────────────────────────
 * The order in force:
 *     scroller auto -> TabBar host auto -> band z-[1] -> chrome z-[2]
 *     -> drawer scrim 10 / panel 11 -> overlays 50 / 300
 * CSS paints positive z-index after `auto` regardless of DOM order, which is
 * why the floating TabBar pill (`auto`) loses to this layer even though it is
 * mounted after it. Two separate regressions in this project came from getting
 * that backwards, so it is checked in a browser and not reasoned about.
 *
 * ⚠ THE LAYER ONLY WINS IF ITS PARENT DOES. Mount this at the PAGE ROOT, the
 *   same `relative` element the page's other overlays pin to. Nested inside
 *   the header's chrome block (`z-[2]`) it would be trapped in that stacking
 *   context and paint under the pill at any z-index at all.
 *
 * ── TOKENS ────────────────────────────────────────────────────────────────
 * Every colour is a token that four themes re-pick, and NONE is written as a
 * two-argument `var(--token, #hex)` — every fallback in this repo was deleted
 * deliberately, because a fallback is an invisible second source of truth that
 * wins exactly when the token is missing:
 *     scrim       bg-scrim                   (:root / dark / contrast all differ)
 *     surface     bg-popover                 (shadcn's semantic token for this
 *                                             exact surface; `contrast` paints
 *                                             it red on purpose)
 *     ink         text-popover-foreground
 *     hairline    border-border, <Separator> bg-border
 *     elevation   [box-shadow:var(--shadow-overlay)]  — the house float tier,
 *                                             same as TabBar.jsx:416
 *     checkmark   text-primary
 *     count       text-muted-foreground
 *     hover       bg-accent
 */
import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import {
  MORE_MENU_ANCHOR_GAP,
  MORE_MENU_FALLBACK_ANCHOR,
  MORE_MENU_HEADING,
} from '@/v2/components/moreMenuModel'

/* ── MOTION ────────────────────────────────────────────────────────────────
   There is NO animation library in this repo — not framer-motion, not motion —
   and none is being added. A one-off keyframe lives in a scoped <style>, which
   is the pattern EventsScreen.jsx:436 already uses for the alerts slide-in.

   REDUCED MOTION IS HANDLED IN CSS, not in JS. A media query re-evaluates when
   the OS setting changes mid-session; a value read once into React state does
   not. The reduced branch drops the transform entirely and keeps the fade, so
   the menu still announces itself as arriving rather than snapping. */
const KEYFRAMES = `
@keyframes more-menu-in {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes more-menu-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
[data-name="more-menu-card"] {
  animation: more-menu-in 170ms cubic-bezier(0.32, 0.72, 0, 1) both;
}
[data-name="more-menu-scrim"] {
  animation: more-menu-fade-in 170ms linear both;
}
@media (prefers-reduced-motion: reduce) {
  [data-name="more-menu-card"],
  [data-name="more-menu-scrim"] {
    animation: more-menu-fade-in 100ms linear both;
  }
}
`

/* ── THE CHASSIS IS THE FRAME'S, 2026-11-08 (200047:135363) ───────────────
   204px is the SelectContent instance's own width. It replaces the 250 that
   stood here, which was "the width of a system menu on an iPhone" — a sensible
   guess made when no frame drew this menu. One now does.

   `max-w-[calc(100%-32px)]` STAYS AND IS THE WHOLE OF REQUIREMENT 5. The frame
   is 402 wide and puts the card at x=172; the app shell is 393. Neither number
   is written anywhere here. The card is `absolute`, right-anchored off the
   measured badge (see THE ANCHOR), so 402-vs-393 resolves itself and the
   max-w only bites on a host narrower than 236. Nothing hard-codes x=172.

   18px radius and the 4px pad are `--component/select/content/radius` and
   `--spacing/1` from the node. The border is the node's
   `--component/popover/ring` (rgba(10,10,10,0.05)), carried by this repo's
   own `border` token rather than re-typed as a literal, so it themes.

   THE SHADOW NEEDED NO WORK AND NO NEW TOKEN. The node's popover shadow is
   `0 25px 50px -12px rgba(0,0,0,0.1)` (layer-1; layer-2 is 0 0 0 0 and fully
   transparent, i.e. a disabled slot). `--shadow-overlay` at src/index.css:518
   is byte-identical to it and is already themed for the other three themes.
   Verified before assuming — this is the one place a "new token" would have
   been reached for by reflex. */
/* THE HEIGHT CAP IS NOT DECORATION. The card is `absolute` inside the
   `inset-0` layer, so its 100% is the phone frame's 852px; 64 is the ~48px it
   starts at plus a 16px gutter at the bottom. Today's menus are two and three
   rows and never reach it. A menu that CAN run off the bottom of a frame with
   `overflow: hidden` on it loses its last rows with no tell at all, and more
   rows are expected here. Apple allows the scroll for exactly this case: "if a
   menu is too long... People expect such a menu to accommodate all the items
   they add to it, so a long menu is fine, and scrolling is acceptable." */
const CARD = [
  'absolute flex w-[204px] max-w-[calc(100%-32px)] max-h-[calc(100%-64px)] flex-col',
  'overflow-y-auto overflow-x-hidden overscroll-contain',
  'rounded-[18px] border border-solid border-border bg-popover p-[4px]',
  'text-popover-foreground [box-shadow:var(--shadow-overlay)]',
].join(' ')

/* `section01` — the frame's one visible slot, holding the heading and the three
   rows at gap-[3px] inside a 4px pad. It is a real `role="group"` rather than a
   bare <div> for an ARIA reason: `role="menu"` restricts its children to
   menuitem / group / separator, so the heading cannot be a direct child of the
   menu. Inside a group it can, and `aria-labelledby` then makes it the group's
   accessible name — which is how the heading reaches a screen reader at all.
   section02 and section03 are `hidden="true"` in the node and are shadcn's
   default slot content, so there is exactly one of these. */
const SECTION = 'flex w-full flex-col gap-[3px] p-[4px]'

/* The `SelectLabel`. px/py are `--spacing/2` and `--spacing/1,5` from the node.
   Not a heading element: it labels a group, and an <h*> inside a menu would
   put a spurious landmark in the page's outline. */
const HEADING = 'flex w-full items-center px-[8px] py-[6px] text-sm leading-5 text-slate-900'

/* min-h, not h: a label that wraps grows its row rather than overflowing it.
   44 is Apple's minimum target and is restated in moreMenuModel.js, where a
   test can reach it — the literal is here because Tailwind's scanner only sees
   literal class text and a template-built min-h-[${n}px] emits no CSS at all.

   ⚠ DO NOT PUT A font-family UTILITY ON THIS BUTTON. src/index.css:921 carries
   a bare, UNLAYERED `button { font-family: inherit }`, and unlayered CSS beats
   `@layer utilities` — so the class lands in the DOM, the computed style
   ignores it, and the class string reads correctly while the type is wrong.
   The header's More badge lost time to exactly this on 2026-11-07. Nothing
   here names a family at all, which is also what PillTabs and the repo's other
   anchored menus do, so the rows inherit the app stack. VERIFIED in the
   browser, not read off the classes: the label computes to
   `Figtree, Inter, -apple-system, BlinkMacSystemFont, sans-serif` at 500/14px,
   identical to the page's own body text. If a family is ever wanted here it
   goes on the inner <span>, never on the <button>. */
/* ── THE ONE PLACE THE FRAME IS NOT FOLLOWED, AND WHY ─────────────────────
   The node's SelectItem is a FIXED `h-[36px]`. That is 8px under Apple's
   minimum touch target, and this file's own constant — exported so a test can
   reach it — is 44. `moreMenu.dom.test.jsx` asserts the class on every row.

   36 is not taken. A 36px row on a 393px phone is a real miss-rate, the number
   was written down here deliberately before any frame existed, and shrinking a
   touch target is a silent accessibility regression of exactly the kind Rule 0
   exists to stop. The card therefore stands ~24px taller than the frame's 165
   (44*3 + 32 + gaps + pads), which is REPORTED to the owner rather than
   resolved in either direction.

   Everything else on the row IS the frame's: gap `--spacing/2` (8px), radius
   `--component/select/item/radius` (14px), and the node's 12px item padding,
   kept on the x axis where it sets the label's inset and relaxed on the y
   axis so `min-h` can do its job without the row growing past it. */
const ROW = [
  'flex min-h-[44px] w-full cursor-pointer items-center gap-[8px] rounded-[14px]',
  'px-[12px] py-[8px] text-left outline-none transition-colors duration-150',
  'motion-reduce:transition-none',
  /* FOCUS IS A RING, NOT A FILL. The row in effect already carries a
     slate-100 fill, so the old `focus-visible:bg-accent` was invisible on
     exactly the row that takes focus first when the menu opens — see the
     focus effect below. `ring-ring` is the repo's own focus token (App.jsx:361
     and three more). `ring-inset` keeps it inside the 4px card pad instead of
     being clipped by the card's `overflow-y-auto`. */
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
].join(' ')

/* The row in effect: `--colors/slate/100` fill, and a label in the node's
   `--wint-blue-accent` (#0b81f8). That hex is NOT a registered colour token —
   `--color-wint-blue-accent` does not exist, and a `text-wint-blue-accent`
   utility would emit NO CSS and NO error (the Tailwind v4 trap that has broken
   this repo three times). It is carried by `--primary`, src/index.css:173,
   which is commented with that exact hex. So: `text-primary`. Checked in the
   stylesheet before it was written, not after. */
const ROW_SELECTED = 'bg-slate-100 text-primary'
const ROW_IDLE = 'bg-popover text-slate-900 hover:bg-accent'

/* The count badge. The node paints a two-layer gradient wash and 12px/16px
   Medium slate-800 text at a 14px radius.

   THE WASH IS TAKEN FROM PillTabs' `BADGE_WASH`, NOT FROM THE NODE'S LITERAL
   rgba STOPS. PillTabs:254 solved this badge already, and it solved a bug the
   literals cause: painted as rgba literals the same badge read 4.22:1 as a
   light sticker on a dark bar under `dark`. Its stops come from
   `--app-bg-stops` so all four themes work. Re-typing Figma's rgba here would
   reintroduce that exact defect on a second surface. */
const BADGE = [
  'flex h-[20px] shrink-0 items-center justify-center overflow-clip',
  'rounded-[14px] px-[8px] py-[2px]',
  'text-[12px] font-medium leading-4 tabular-nums text-slate-800',
].join(' ')

const BADGE_WASH = {
  backgroundImage:
    'linear-gradient(145.43317186803606deg, var(--app-bg-stops)), linear-gradient(90deg, var(--card) 0%, var(--card) 100%)',
}

/**
 * @param {object}   props
 * @param {boolean}  props.open      renders nothing when false. See REJECTED E
 *                                   for why there is no exit state.
 * @param {Function} props.onClose   called for every dismissal route.
 * @param {Array}    props.items     `{ id, label, count?, icon?, onSelect?,
 *                                   separatorBefore? }[]`.
 *                                   `count`           a trailing number. Its
 *                                                     own accessible name, so
 *                                                     it never abuts the label
 *                                                     in textContent.
 *                                   `icon`            a component (lucide), in
 *                                                     the LEADING slot, which
 *                                                     is where the frame puts
 *                                                     it. The slot is reserved
 *                                                     whether or not an item
 *                                                     passes one. The tick
 *                                                     trails. (Until
 *                                                     2026-11-08 this was the
 *                                                     other way round — see
 *                                                     point 6.)
 *                                   `onSelect`        an item that ACTS rather
 *                                                     than navigates. When it
 *                                                     is present the menu's
 *                                                     own `onSelect` is NOT
 *                                                     called, so no page has
 *                                                     to filter a non-
 *                                                     destination id back out.
 *                                   `separatorBefore` starts a new group.
 * @param {string}   props.value     the id drawn with the checkmark.
 * @param {Function} props.onSelect  called with the picked id.
 * @param {string}   props.id        matches the More badge's `aria-controls`.
 * @param {string}   props.labelledBy  the More badge's own id. It names the
 *                                   menu AND is how the anchor is found and
 *                                   focus is given back — see THE ANCHOR.
 *
 * ── HOW A PAGE WIRES THIS TO THE HEADER ──────────────────────────────────
 * AppHeaderBar shipped as:
 *   AppHeaderBar({ title, label, eyebrow, onBack, backLabel, onOpenMore,
 *                  moreOpen, moreMenuId, moreLabel, leading, className })
 * so the page owns both ids and hands the SAME string to both sides:
 *
 *   const menuId = 'system-more-menu'
 *   <AppHeaderBar onOpenMore={() => setMoreOpen(true)} moreOpen={moreOpen}
 *                 moreMenuId={menuId} ... />
 *   <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)}
 *             id={menuId} labelledBy={<the badge's own id>} ... />
 *
 * `moreMenuId` -> this component's `id`; they must match or `aria-controls`
 * points at nothing. `labelledBy` is the BADGE's id, the other direction.
 */
export default function MoreMenu({
  open,
  onClose,
  items = [],
  value,
  onSelect,
  id,
  labelledBy,
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const hostRef = useRef(null)
  const itemRefs = useRef([])
  /* What the open-time focus effect needs to read WITHOUT re-running every
     time the page hands down a new `items` array. `react-hooks/refs` forbids
     writing a ref during render, so the sync is a layout effect — and it is
     declared HERE, above the effects that read it, because layout effects run
     in declaration order and a stale read would put the initial focus on the
     wrong row. */
  const latest = useRef({ items, value })
  useLayoutEffect(() => {
    latest.current = { items, value }
  }, [items, value])

  const cardRef = useRef(null)

  /* A generated id so a bare mount is still valid HTML and `aria-labelledby`
     has something to point at. A real call site passes both. */
  const fallbackId = useId()
  const menuId = id ?? fallbackId

  /* The heading's own id, so the frame's `Select preview` can be the section
     group's accessible name. Derived from the menu's id rather than a second
     useId so it stays stable and readable in a DOM dump. */
  const headingId = `${menuId}-heading`

  const focusItemAt = useCallback((index) => {
    const nodes = itemRefs.current.filter(Boolean)
    if (!nodes.length) return
    const wrapped = ((index % nodes.length) + nodes.length) % nodes.length
    nodes[wrapped]?.focus()
  }, [])

  /* ── THE ANCHOR ──────────────────────────────────────────────────────────
     Measured, not hard-coded. The component contract carries no anchor props,
     and it does not need any: `labelledBy` IS the badge's id, so the badge can
     be found and measured. That is also the honest implementation of the iOS
     rule — the menu comes out of the control that revealed it, wherever the
     page has put that control, rather than out of a constant that silently
     stops matching the day the header's height changes.

     `top`/`right` are relative to this layer, which is `inset-0` on the page
     root, so its rect IS the page's box.

     THE ZERO-RECT CASE IS NOT A FAILURE. happy-dom and jsdom return 0 for
     every rect, so the DOM suites would otherwise pin the menu to the top-left
     corner. An unmeasurable anchor falls back to the header's geometry from
     contract §4 rather than to 0 — and because that fallback is also the
     card's inline style below, an unmeasurable anchor needs no work at all.

     THE OFFSETS ARE WRITTEN TO THE NODE, NOT HELD IN STATE. `react-hooks/
     set-state-in-effect` is an error in this config and it is right to be: a
     setState here would render the card once at the fallback and again one
     frame later at the measured position, which is a visible jump at the
     start of the open animation. Writing the two properties straight onto the
     element is the "update an external system" case the rule exists for. */
  useLayoutEffect(() => {
    if (!open) return
    const card = cardRef.current
    if (!card) return
    const anchorEl = labelledBy ? document.getElementById(labelledBy) : null
    const hostBox = hostRef.current?.getBoundingClientRect()
    const anchorBox = anchorEl?.getBoundingClientRect()
    if (!hostBox || !anchorBox || (!anchorBox.width && !anchorBox.height)) return
    card.style.top = `${Math.round(anchorBox.bottom - hostBox.top) + MORE_MENU_ANCHOR_GAP}px`
    card.style.right = `${Math.max(0, Math.round(hostBox.right - anchorBox.right))}px`
  }, [open, labelledBy])

  /* ── FOCUS ───────────────────────────────────────────────────────────────
     In on open, onto the checked row if there is one — that is where a UIMenu
     puts the selection — and back to the badge on close. Returning it by
     `labelledBy` rather than to whatever had focus is deliberate: picking an
     item can navigate, and focus belongs on the control the user pressed, not
     on something the new view happens to mount. */
  useLayoutEffect(() => {
    if (!open) return
    const { items: list, value: current } = latest.current
    const index = list.findIndex((item) => item.id === current)
    focusItemAt(index >= 0 ? index : 0)
  }, [open, focusItemAt])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    return () => {
      const badge = labelledBy ? document.getElementById(labelledBy) : null
      const back = badge ?? previous
      if (back && typeof back.focus === 'function' && document.contains(back)) back.focus()
    }
  }, [open, labelledBy])

  /* ── DISMISSAL: route change ─────────────────────────────────────────────
     The other three routes are direct — scrim tap, Escape, item pick. This one
     is not: a menu that survives a navigation would reopen over a page it was
     never built for. `location.key` changes on every navigation including a
     push to the same path, which `pathname` alone would miss. */
  const routeKey = location.key ?? `${location.pathname}${location.search}`
  const seenRoute = useRef(routeKey)
  useEffect(() => {
    if (seenRoute.current === routeKey) return
    seenRoute.current = routeKey
    if (open) onClose?.()
  }, [routeKey, open, onClose])

  const handleKeyDown = (event) => {
    const nodes = itemRefs.current.filter(Boolean)
    const here = nodes.indexOf(document.activeElement)
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        /* Stop it here. An Escape that keeps bubbling would close the menu AND
           whatever the menu is sitting on. */
        event.stopPropagation()
        onClose?.()
        break
      case 'ArrowDown':
        event.preventDefault()
        focusItemAt(here + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusItemAt(here - 1)
        break
      case 'Home':
        event.preventDefault()
        focusItemAt(0)
        break
      case 'End':
        event.preventDefault()
        focusItemAt(nodes.length - 1)
        break
      case 'Tab':
        /* THE TRAP. Tab cycles inside the menu instead of walking out of it
           into a page the scrim has made unreachable to a pointer. The scrim
           itself is tabIndex -1 so it is not a stop on that cycle. */
        event.preventDefault()
        focusItemAt(here + (event.shiftKey ? -1 : 1))
        break
      default:
        break
    }
  }

  if (!open) return null

  return (
    <div
      ref={hostRef}
      /* z-50: the overlay tier. See z-50, AND WHY THAT NUMBER in the header —
         and mount this at the PAGE ROOT or the number cannot help you. */
      className="absolute inset-0 z-50"
      data-name="more-menu-layer"
    >
      <style>{KEYFRAMES}</style>

      {/* THE SCRIM. A tap outside is a dismissal, not a pick — HIG, Popovers:
          "a popover generally closes when people click or tap outside its
          bounds". It is a real <button> because that is the house pattern for
          an in-frame scrim (SystemsFilterSheet.jsx:116, AccountScreenV2.jsx),
          and it carries `common.close` from the catalogue rather than a string
          written for it.

          tabIndex -1: it is a pointer target, not a tab stop. Inside a focus
          trap a focusable scrim is a cycle member that does nothing. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-scrim backdrop-blur-[2px]"
        data-name="more-menu-scrim"
      />

      <div
        ref={cardRef}
        id={menuId}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby={labelledBy}
        onKeyDown={handleKeyDown}
        /* The header's geometry, which the layout effect above overwrites with
           the real measurement. It is the FIRST PAINT position, so it has to
           be close enough that an unmeasurable anchor still lands under the
           badge. The origin is the badge's corner, so the card scales OUT OF
           the control rather than appearing beside it. */
        style={{
          top: MORE_MENU_FALLBACK_ANCHOR.top,
          right: MORE_MENU_FALLBACK_ANCHOR.right,
          transformOrigin: 'top right',
        }}
        className={CARD}
        data-name="more-menu-card"
      >
        {/* `section01`. See SECTION — the group exists so the heading can be
            announced without being an invalid child of role="menu". */}
        <div className={SECTION} role="group" aria-labelledby={headingId} data-name="more-menu-section">
          {/* The frame's SelectLabel. `MORE_MENU_HEADING` is transcribed, and
              is flagged NEW COPY in moreMenuModel.js because it is a string
              this product has never shipped and is not in the catalogue. */}
          <p id={headingId} className={HEADING} data-name="more-menu-heading">
            {MORE_MENU_HEADING}
          </p>

          {items.map((item, index) => {
            const selected = item.id === value
            const Icon = item.icon ?? null
            return (
              <Fragment key={item.id}>
                {/* A hairline between GROUPS, never between every row. Radix's
                    Separator is a plain <div> and does not portal. `decorative`
                    false so it is a real `role="separator"`, which is a valid
                    child of a group; the default `true` would emit
                    `role="none"` and the group break would not be announced.
                    Suppressed in first position: a rule above the top row is a
                    group break with nothing on the other side of it. */}
                {item.separatorBefore && index > 0 ? (
                  <Separator decorative={false} className="my-[5px]" />
                ) : null}

                <button
                  ref={(node) => { itemRefs.current[index] = node }}
                  type="button"
                  role="menuitem"
                  /* The selected state, ANNOUNCED. NOT `aria-checked` — see
                     REJECTED F. The frame marks this row with a tick glyph and
                     a blue label, i.e. with shape and colour only, which this
                     repo's accessibility rule forbids outright. The glyph is
                     transcribed AND the state is announced; the frame cannot
                     draw the second half, so it is added rather than taken. */
                  aria-current={selected ? 'true' : undefined}
                  /* THE ACCESSIBLE NAME IS THE LABEL ALONE, and the count is
                     said separately below. Folding the number in once renamed
                     "Systems" to "Systems 103", which broke systemsTabScope's
                     lookup — that suite pins `aria-label === 'Systems'` at :78
                     and this change does not own it. It also keeps two numbers
                     from abutting in textContent, which copy standard §4
                     forbids. */
                  aria-label={item.label}
                  onClick={() => {
                    /* An item with its own handler ACTS; one without
                       NAVIGATES. Never both, so a page never sees an id that
                       is not one of its destinations. */
                    if (item.onSelect) item.onSelect(item.id)
                    else onSelect?.(item.id)
                    onClose?.()
                  }}
                  className={`${ROW} ${selected ? ROW_SELECTED : ROW_IDLE}`}
                  data-name="more-menu-item"
                  data-menu-item={item.id}
                >
                  {/* ── THE LEADING SLOT IS THE ICON'S NOW, NOT THE TICK'S ───
                      This is the one structural inversion the frame makes. The
                      previous build reserved the leading gutter for the
                      checkmark and put `icon` in the TRAILING slot, on Apple's
                      "a checkmark icon on the leading edge" and UIKit's
                      placement of a UIAction image. The frame does the
                      opposite: a 16px glyph leads every row and the tick
                      trails the one in effect. The frame wins — it is the
                      design, and HIG is what was followed in its absence.

                      RESERVED ON EVERY ROW, icon or not, so labels stay on one
                      left edge. All three of today's rows carry one, which
                      finally satisfies Apple's "icons for all menu items in a
                      group, or none of them" in the affirmative; a future row
                      without one still lines up. The glyph inherits the row's
                      text colour, so it goes blue with the label on the
                      selected row exactly as the node draws it. */}
                  <span
                    className="flex size-[16px] shrink-0 items-center justify-center"
                    aria-hidden="true"
                    data-name="more-menu-item-icon"
                  >
                    {Icon ? <Icon className="size-[16px]" strokeWidth={1.5} /> : null}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm leading-5">
                    {item.label}
                  </span>

                  {/* The count badge. Bound to live data by the call site —
                      the frame's literal `8` is Figma's default component
                      content and is NOT transcribed. moreMenuModel.js carries
                      the evidence for that call. */}
                  {item.count != null ? (
                    <span
                      className={BADGE}
                      style={BADGE_WASH}
                      /* Said in the caller's own units rather than as a bare
                         number: "244 systems", not "244". systemsTabScope:78
                         pins this shape as /^\d+ systems$/. */
                      aria-label={`${item.count} ${String(item.label).toLowerCase()}`}
                      data-name="more-menu-item-count"
                    >
                      {item.count}
                    </span>
                  ) : null}

                  {/* The trailing tick — `Huge Icons / tick-02` in the node.
                      aria-hidden because `aria-current` above is what actually
                      announces the state; this is the sighted cue only.

                      A SELECTED ROW THAT ALSO HAS A COUNT DRAWS BOTH. The
                      frame never draws that state — its selected row is
                      Overview, which has no badge — but it is reachable the
                      moment a user picks Systems, and both suites that open
                      this menu exercise it. Dropping either one would drop
                      information rather than transcribe an absence, so both
                      render and the stacking is reported. */}
                  {selected ? (
                    <Check
                      className="size-[16px] shrink-0"
                      strokeWidth={2}
                      aria-hidden="true"
                      data-name="more-menu-item-check"
                    />
                  ) : null}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
