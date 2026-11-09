/**
 * moreMenuModel — the item sets MoreMenu draws, and the constants its tests
 * and its call sites have to agree on.
 *
 * ── WHY THIS IS A SEPARATE FILE ───────────────────────────────────────────
 * `react-refresh/only-export-components` is an ERROR in this repo's eslint
 * config (eslint.config.js extends `reactRefresh.configs.vite`). A file that
 * exports a component may export NOTHING else. So MoreMenu.jsx exports its
 * component and only its component, and everything below lives here.
 *
 * ── WHY THE PAGES DO NOT EACH BUILD THEIR OWN ARRAY ───────────────────────
 * This file exists for the same reason PillTabs.jsx does. The control it
 * replaces was two near-copies of one row, one of which was restyled and the
 * other forgotten, and the owner saw the result as two different controls for
 * the same job. The System page's menu and the Location page's menu differ by
 * exactly ONE row. Written out twice they will differ by more within a month,
 * so they are written once, here, and the difference is a parameter.
 *
 * MoreMenu itself knows none of this. It draws whatever `items` it is handed,
 * and these builders are a convenience the two pages share — not a limit on
 * what the component can show. More rows are expected (see THE SECOND GROUP).
 *
 * ── THE IDS ARE A CONTRACT, NOT A NAMING CHOICE ───────────────────────────
 * `overview` / `systems` / `general` are the ids the tab row already uses at
 * both call sites (HomeAllAccounts.jsx and SystemPageV2Screen.jsx pass them to
 * PillTabs). The menu is a change of CONTROL, not of destination: the same id
 * has to reach the same page state, or `systemsTabScope.dom.test.jsx`,
 * `scopePersistsAcrossTabs.dom.test.jsx` and every page's `tab` state go with
 * it. Do not "tidy" these into a different spelling.
 *
 * ── ⚠ `Switch location` IS NOT HERE, AND WAS, FOR ABOUT AN HOUR ───────────
 * Contract §5 moved the drawer door into this menu, because deleting the
 * header's `PanelLeft` button would otherwise have left the System and
 * Location pages with no way into NavigationDrawer. The owner then redirected,
 * 2026-11-07: "replace the 'More' in buttom main nav bar With Search - locate
 * right to dashboard. Serach open the nav bar with the systems and locations".
 *
 * The footer's Search tab is the drawer's door now, so this menu does not
 * carry one and MUST NOT claim the accessible name `Switch location`. That
 * name has been broken and restored four times in this project; two suites
 * assert that EXACTLY ONE element per route answers to it
 * (`valveCommitReachable:224`, `dashboardHeaderBar:273`) and three navigate by
 * it. If both this menu and the Search tab wore it, those suites would break
 * in the other direction — silently, by picking the wrong control.
 *
 * Neither this file nor MoreMenu.jsx may reference the catalogue entry that
 * holds that string, and neither does. That is the whole of the rule; it is
 * written out because the deleted version of this file argued at length for
 * the opposite, and the argument was correct on the day it was written.
 *
 * As of this change the name is on ZERO elements app-wide, which is EXPECTED
 * and is the footer Search tab's to claim — not this menu's. Do not take it
 * back on seeing the count at 0.
 *
 * ── THE SECOND GROUP, EXPECTED BUT NOT BUILT ──────────────────────────────
 * Swapping the footer's More tab for Search orphans `/more`
 * (MoreComingSoonScreen), which the owner designated for Users and Reports.
 * Those may land in this menu. Nothing is built for them, and nothing should
 * be until he says so — but the shape is already right: a second group is an
 * item carrying `separatorBefore: true`, which is the only thing a new group
 * needs. Do not collapse that prop just because today's lists do not use it.
 *
 * ── THE 2026-11-08 FRAME (200047:135363), AND THE TWO NAMES IT DISAGREES ──
 * The menu now has a design: the `SelectContent` instance, 204x165, drawn
 * right-aligned under the header's More badge. `get_design_context` on it is
 * cached, so re-deriving this costs no Figma call.
 *
 * What the frame ADDED, and is transcribed below and in MoreMenu.jsx:
 *   · a `SelectLabel` heading — `Select preview`. See MORE_MENU_HEADING.
 *   · a LEADING 16px icon on every row (dashboard-square-02 / location-06 /
 *     an information circle). Apple's "icons for all items in a group, or
 *     none" is now satisfied in the first direction rather than the second.
 *   · the chassis: 18px card radius, 14px row radius, a slate-100 fill and a
 *     `--primary` label on the row in effect, and a TRAILING tick.
 *
 * ⚠ WHAT IT DISAGREES WITH, REPORTED AND NOT RESOLVED HERE. Two labels in the
 * frame are not the labels this menu ships, and BOTH are pinned by suites this
 * change does not own:
 *
 *   frame `Locations`      vs shipped `Systems`
 *   frame `General info`   vs shipped `General Info`
 *
 * `systemsTabScope.dom.test.jsx:65` and `valveWidgetMount.dom.test.jsx:593`
 * both do `getByRole('menuitem', { name })` over
 * `['Overview', 'Systems', 'General Info']`, and systemsTabScope:78 further
 * pins `aria-label === 'Systems'` and a count announced as `/^\d+ systems$/`.
 * Taking either rename would fail those two files, which only their owners may
 * edit — and the `Locations` one would additionally make the row misdescribe
 * what it opens, which is still the SYSTEMS table. So the shipped strings
 * stand, the frame's are recorded here, and the rename stays the owner's.
 */
import { LayoutGrid, MapPin, Info } from 'lucide-react'

/**
 * Every id the menu can carry today.
 *
 * All three are DESTINATIONS — each one swaps the page's body and becomes the
 * menu's `value`. There is no action-shaped id left in this menu (see
 * `Switch location` in the header above), which is why no builder below sets a
 * per-item `onSelect`. The component still supports one; an item that acts
 * rather than navigates is a legitimate future row.
 */
export const MORE_MENU_IDS = Object.freeze({
  overview: 'overview',
  systems: 'systems',
  general: 'general',
})

/**
 * The labels, transcribed from the control this menu replaces.
 *
 * NOT NEW COPY, and deliberately NOT from the catalogue. These three strings
 * are what `PillTabs` already renders at both call sites today
 * (HomeAllAccounts.jsx:1741-1767, SystemPageV2Screen.jsx:2546-2547), so
 * carrying them over verbatim is transcription, not authorship. Nothing in
 * this menu is a string anybody wrote for it.
 *
 * ⚠ CONFLICT, REPORTED NOT RESOLVED. The locale catalogue holds two keys that
 * look like these — `home.overview_tab` ("Overview") and `home.info_tab`
 * ("Info") — but `home.info_tab` is "Info", NOT "General Info". Pointing the
 * third row at it would silently rename a control the owner has never been
 * shown renamed, and `General Info` is what both pages ship. So the literals
 * stay and the catalogue drift is reported rather than resolved here. Whoever
 * reconciles the two has to decide which string the product means; it is not
 * a mechanical fix.
 *
 * The cost of the literals is that these rows do not translate. That is
 * EXACTLY the cost the tab row already pays — it has always passed English
 * literals — so this is carried over, not introduced.
 */
export const MORE_MENU_LABELS = Object.freeze({
  overview: 'Overview',
  systems: 'Systems',
  general: 'General Info',
})

/**
 * The menu's heading, transcribed from the frame's `SelectLabel`.
 *
 * NEW COPY — AWAITING THE OWNER'S SIGN-OFF. It is transcribed, not authored:
 * `Select preview` is the literal text of node
 * I200047:135363;2757:10157;200047:135366. But it is a string this product has
 * never shipped and it is NOT in the locale catalogue, so like the three row
 * labels above it does not translate, and unlike them it has no tab-row
 * ancestor to inherit approval from.
 *
 * It also reads oddly against what the rows do: they do not change a "preview",
 * they swap the page's body. `Select view` would describe the control; so would
 * no heading at all, which is what shipped until today. Per §0 of
 * .claude/skills/wint-ui-copy/SKILL.md the alternative is NOT chosen here — the
 * frame's own string ships and the question goes to the owner.
 *
 * Sentence case, which is §3b-correct as transcribed. No change was needed.
 */
export const MORE_MENU_HEADING = 'Select preview'

/**
 * The frame's row icons, as lucide equivalents of its Huge Icons set.
 *
 *   dashboard-square-02  -> LayoutGrid   (the 4-square grid, Overview)
 *   location-06          -> MapPin       (the pin, Systems/"Locations")
 *   information-line     -> Info         (the circled i, General Info)
 *
 * The third is the frame's own confusion, transcribed by its ARTWORK rather
 * than its layer name: the layer is called `Huge Icons / smile` but the asset
 * it actually draws is `RemixIconsInformationLine`, rotated 180 and flipped.
 * The screenshot shows a circled `i`. A smiley on `General Info` would be
 * nonsense, so the artwork wins over the name here.
 *
 * NOT exported as a map, deliberately: `react-refresh/only-export-components`
 * is an ERROR in this config, and an exported object of PascalCase components
 * is the shape that rule looks for. The builders below attach them instead.
 */
const ROW_ICONS = Object.freeze({
  overview: LayoutGrid,
  systems: MapPin,
  general: Info,
})

/**
 * Apple's minimum touch target, and the floor every row in this menu sits on.
 *
 * Written down here, rather than only in a class string, for the same reason
 * `tabBarMetrics.js` exists: a test can assert against the number and tell you
 * which class string disagrees. MoreMenu.jsx spells `min-h-[44px]` as a
 * literal because Tailwind's scanner only sees literal class text — a
 * template-built `min-h-[${n}px]` emits no CSS and the row silently collapses.
 */
export const MORE_MENU_ROW_MIN_HEIGHT = 44

/**
 * ⚠ `Overview` IS IN BOTH LISTS BELOW, AND TWO BRIEFS SAID IT WOULD NOT BE.
 *
 * Contract §5: "Overview is NOT an item - it is the page itself, the thing you
 * return to by closing the menu or picking nothing. Model it as the default
 * value." The 2026-11-07 scope note repeats it: System page `General Info`,
 * Location page `Systems` · `General Info`, "do not pad it to look fuller".
 *
 * Padding is not what this is. Closing the menu does not change `value`, so
 * with Overview omitted the sequence is:
 *
 *     tap More -> General Info -> body swaps -> reopen More -> [General Info]
 *
 * and there is no control left anywhere on either page that goes back to
 * Overview. The tab row that did it in one tap is deleted by this same change.
 * On the System page the menu would be a single row that can only ever be
 * taken once. That is Rule 0 — working functionality removed without the
 * owner's word — and it is a one-way door a reviewer finds in ten seconds.
 *
 * It is also not the iOS pattern this menu was asked to follow. A menu
 * choosing among mutually exclusive destinations is `UIMenu(options:
 * .singleSelection)`, and such a menu lists every option with a checkmark on
 * the one in effect; it does not hide the option you are on. Apple: "Consider
 * using a checkmark to show that an attribute is currently in effect." With
 * Overview omitted the System page's menu draws NO checkmark in its default
 * state, and the `value` prop both briefs specify is half-dead.
 *
 * So it is listed, it is still the default `value`, and this is RAISED, not
 * decided. `includeOverview: false` gives the literal brief, in one argument,
 * at either call site — but a page that passes it needs some other way back to
 * Overview first, and that is the thing to ask the owner about.
 */
const OVERVIEW_ITEM = Object.freeze({
  id: MORE_MENU_IDS.overview,
  label: MORE_MENU_LABELS.overview,
  icon: ROW_ICONS.overview,
})

/**
 * The System page's menu — `/system/:id`, SystemPageV2Screen.
 *
 *   Overview · General Info
 *
 * This page's existing tab row, in its existing order. Apple: "Prefer listing
 * important or frequently used menu items first." The tab row's order already
 * encodes that, so it is kept rather than re-derived.
 *
 * @param {object}  [o]
 * @param {boolean} [o.includeOverview=true]  see the ruling above.
 */
export function systemMoreMenuItems({ includeOverview = true } = {}) {
  return [
    ...(includeOverview ? [OVERVIEW_ITEM] : []),
    { id: MORE_MENU_IDS.general, label: MORE_MENU_LABELS.general, icon: ROW_ICONS.general },
  ]
}

/**
 * The Location page's menu — `/`, HomeAllAccounts.
 *
 *   Overview · Systems (N) · General Info
 *
 * One row more than the System page's, and that row carries a live count.
 *
 * ⚠ `Systems` KEEPS ITS NAME AND ITS COUNT, and the Figma conflict that rides
 *   on it is INHERITED, not introduced. Figma labels the middle trigger
 *   "Locations" with a count badge; the control opens the SYSTEMS table, so
 *   the tab row has always shipped "Systems" and reported what the tab
 *   actually opens, with the rename left for the owner. The long form is at
 *   HomeAllAccounts.jsx:1742-1765. Moving the control into a menu does not
 *   answer that question and must not quietly decide it.
 *
 * @param {object}      [o]
 * ⚠ THE FRAME'S `8` IS NOT TRANSCRIBED, AND THAT IS DELIBERATE. The badge in
 *   200047:135363 reads a literal `8`. The same `8`-on-a-Locations-row appears
 *   across unrelated nodes in that file, including on surfaces that cannot
 *   count 8 of anything, so it is Figma's default component content and not a
 *   measurement. Transcribing it would put a fabricated number on the face of
 *   the UI — the one thing §4 of the copy standard is most explicit about.
 *   The count is therefore BOUND TO LIVE DATA, which is what this parameter is
 *   and what it already was: HomeAllAccounts.jsx:1460 passes
 *   `live?.stats?.total`. Nothing here hard-codes a count.
 *
 * @param {number|null} [o.systemCount]  how many systems the Systems view
 *                                       opens. `null` draws no count, which is
 *                                       the honest state while the data is
 *                                       absent — a `0` would be a measurement.
 * @param {boolean}     [o.includeOverview=true]  see the ruling above.
 */
export function locationMoreMenuItems({ systemCount = null, includeOverview = true } = {}) {
  return [
    ...(includeOverview ? [OVERVIEW_ITEM] : []),
    {
      id: MORE_MENU_IDS.systems,
      label: MORE_MENU_LABELS.systems,
      count: systemCount ?? null,
      icon: ROW_ICONS.systems,
    },
    { id: MORE_MENU_IDS.general, label: MORE_MENU_LABELS.general, icon: ROW_ICONS.general },
  ]
}

/**
 * Where the menu's top-right corner sits when its anchor cannot be measured.
 *
 * MoreMenu measures the real badge at open time and only falls back to these
 * — see THE ANCHOR in MoreMenu.jsx. They are the geometry of the header in
 * contract §4: a 59px bar holding a 24px Badge with `items-center`, inside the
 * page's 16px gutter. 59/2 + 24/2 = 41.5 to the badge's bottom edge, plus the
 * 6px gap the repo's other anchored menus already use
 * (`top-[calc(100%+6px)]`, EventsTimelineCard.jsx:594), rounded to 48.
 */
export const MORE_MENU_FALLBACK_ANCHOR = Object.freeze({ top: 48, right: 16 })

/** The gap between the badge's bottom edge and the menu's top edge. */
export const MORE_MENU_ANCHOR_GAP = 6
