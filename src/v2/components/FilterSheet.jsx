/**
 * FilterSheet — a generic "put the filters behind one control" surface.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Owner, 2026-11-04, on /alerts, looking at the Water / Valve / Power / Comms
 * rail under the Active | History tabs:
 *
 *   "remove the selector for the water valve power communications. Take it
 *    into filter. Use only shadcn component again. Active and history can be
 *    a selector."
 *
 * A rail of category chips is a filter wearing a selector's clothes. It costs
 * a full row of a 393x852 frame, it grows every time a category is added, and
 * at four chips the labels are already ellipsing. Behind one control it costs
 * a button.
 *
 * ── WHY IT IS GENERIC, AND NOT INLINE IN EventsScreen ─────────────────────
 * The valve screen is being moved behind the same kind of surface at the same
 * time. The owner wants ONE filter pattern, not two that look like different
 * apps, so this takes a declarative `groups` array and knows nothing about
 * alerts. Its sibling `SystemsFilterSheet.jsx` is NOT this: that one is bound
 * to `src/data/systemFilters.js` and draws a two-pane drill-down over hundreds
 * of generated options. This is the small case - a handful of known options,
 * all on one screen - and the two should stay separate until a third caller
 * shows which one it wants to be.
 *
 * ── THE CONTRACT ──────────────────────────────────────────────────────────
 *   open      boolean. Renders nothing when false.
 *   title     the sheet heading. Defaults to the repo's existing "Filter by".
 *   groups    [{ id, label, mode, options, visible? }]
 *               mode 'multi'   -> Checkbox rows; value is an ARRAY.
 *                                 An EMPTY array means "no constraint", which
 *                                 is SystemsFilterSheet's own convention and
 *                                 this app's empty-set-means-all rule.
 *               mode 'single'  -> a segmented ToggleGroup; value is a STRING.
 *                                 It has no "neither" state - give it an
 *                                 option that means "all".
 *                                 THE SEGMENT IS FLEX-1 PER OPTION, so it is
 *                                 for 2-3 short words. Past that the labels
 *                                 ellipse, which is the defect this sheet was
 *                                 built to fix - a five-option facet belongs
 *                                 in 'multi'.
 *               options        [{ value, label, count?, name? }]
 *                 label          string, or a NODE for an option that carries
 *                                a mark beside its word (the valve screen's
 *                                state swatches). A node option is matched by
 *                                `value` when the group is searchable.
 *                 count?         how many rows this option would yield. Drawn
 *                                as a trailing shadcn Badge when present.
 *                 name?          the checkbox's accessible name. Omit it and
 *                                the row's own <label> names the control,
 *                                which is right for a bare option; pass it to
 *                                say the count aloud in the caller's own units
 *                                ("320 Summit Blvd, 5 systems") rather than
 *                                have this file invent a noun.
 *               visible        optional (draft) => boolean, for a group that
 *                              only applies while another group holds a
 *                              particular value. /alerts uses it for the water
 *                              high/low tier, which is meaningless unless
 *                              Water itself is on.
 *               selectAll      optional. A tri-state box in the group header
 *                              reading `All N`. ITS N IS THE OPTIONS ON SCREEN
 *                              - under a search that is fewer than the group
 *                              holds, because the number on a control is what
 *                              the control will do. 'multi' only.
 *               searchable     optional. An Input above the option list that
 *                              narrows what is DRAWN, never what is PICKED.
 *                              'multi' only. For a list long enough to need
 *                              finding rather than scanning; a box over a
 *                              two-option group is a control with nothing to
 *                              do. A narrowed list states that it is narrowed.
 *               searchLabel    the search box's placeholder AND its accessible
 *                              name. Required when `searchable`.
 *               searchEmptyLabel  shown when the search matches nothing.
 *               emptyLabel     shown when the group has no options at all.
 *   value     { [groupId]: string[] | string } - the LIVE filter.
 *   onApply   (nextValue) => void. Fires once, with the whole map, on Apply.
 *   onClose   () => void. Cancel, the scrim, the x and Escape all call it.
 *   onClear   optional. Omit it and Clear is computed here (every multi group
 *             to [], every single group to its FIRST option) - pass it when
 *             the caller's reset means something more, e.g. dropping a URL
 *             parameter as well.
 *
 * THE DRAFT IS LOCAL UNTIL APPLY. Cancel restores what was in force, which is
 * what a Cancel button beside an Apply button promises; editing the live
 * filter as the viewer ticks would make Cancel a lie. Same rule, same reason,
 * as SystemsFilterSheet.
 *
 * ── NO PORTAL ─────────────────────────────────────────────────────────────
 * `AccountScreenV2.jsx:644-656`: this app draws inside a fixed 393x852 box
 * (`src/components/Phone.jsx`, `overflow: hidden`), so Radix Popover /
 * DropdownMenu / Select / Dialog / Sheet - every primitive that portals to
 * `document.body` - escapes the frame and paints across the whole window. The
 * usual shadcn "Popover + Command" filter recipe is therefore unavailable.
 * The house pattern is an `absolute inset-0` overlay INSIDE the page
 * (SystemsFilterSheet:111, BulkValveConfirmSheet:1030, ValveConfirmSheet), and
 * that is what this is. Everything INSIDE it is shadcn: Button, Badge,
 * Checkbox, Item, Separator, ToggleGroup - all inline, none of them portals.
 *
 * `aria-modal="true"` is HALF-EARNED here, exactly as BulkValveConfirmSheet
 * documents at its line 483: nothing in this app marks the page behind an
 * in-frame overlay `inert`, so a screen reader's virtual cursor can still
 * reach the list under the scrim. Escape and the scrim are wired; a focus trap
 * is not. Said plainly rather than implied by the attribute.
 *
 * ── COPY ──────────────────────────────────────────────────────────────────
 * Every string this file ships is one the repo already uses: "Filter by",
 * "Close filters", "Cancel", "Apply filter" are SystemsFilterSheet's, and the
 * trigger's accessible name is SystemsTableCard's ("Filter by (N active)").
 * Group labels and option labels are the CALLER'S - translated strings in,
 * no catalogue of its own. Copy rule 0: the catalogue is the source of truth.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Item, ItemContent, ItemTitle } from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { FunnelSimple } from '@/v2/icons'
import { cn } from '@/lib/utils'

/* THE THOUSANDS SEPARATOR IS A COMMA (`docs/wint-format-standards.md`, binding
   project-wide). Every number this file puts on screen goes through it,
   `aria-label`s included - they are read aloud, so they are UI copy. It is a
   FORMAT rule rather than a string, so it belongs here rather than in a
   caller: the valve fleet is sized at "around 1000 valve" and a bare `1000`
   in an option count is the number a reader mis-sizes at a glance. */
const num = (n) => Number(n).toLocaleString('en-US')

/** The plain text of an option, for the search box to match against. `label`
 *  may be a node (a swatch beside a word), so fall back to the value. */
const searchTextOf = (o) => (typeof o.label === 'string' ? o.label : String(o.value))

/* The segmented chip, spelled the way src/components/ui/tabs.jsx spells it, so
   a single-select group inside this sheet is the same control as the
   Active | History row on the page behind it. Source literals, never
   interpolation: Tailwind generates CSS by scanning this file's text. */
const SEG_CHIP = [
  'inline-flex min-w-0 flex-1 shrink basis-0 cursor-pointer items-center justify-center',
  'gap-1.5 overflow-hidden whitespace-nowrap rounded-md',
  'border border-transparent px-[6px] py-[2px] font-medium text-muted-foreground',
  'transition-[color,background-color,border-color,box-shadow]',
  'hover:bg-transparent hover:text-muted-foreground',
  'data-[state=on]:border-primary data-[state=on]:bg-card',
  'data-[state=on]:font-semibold data-[state=on]:text-primary',
  'data-[state=on]:hover:bg-card data-[state=on]:hover:text-primary',
  'data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.1)]',
  'text-sm leading-5',
].join(' ')

/* The caller's own reset string would be better, but every caller so far
   reaches the same catalogue entry and a prop that is always passed the same
   value is a prop that should be a default. Override it by not using Clear. */
const CLEAR_LABEL = 'Clear all filters'

/* SystemsTableCard's string, and the one this file has always shipped. It is a
   constant now because the `chip` variant needs it for the ACCESSIBLE NAME
   while the VISIBLE word is the caller's selection - see `variant` below. */
const FILTER_BY = 'Filter by'

/**
 * The control that opens the sheet, so a second caller gets the same one
 * rather than drawing its own.
 *
 * The anatomy is SystemsTableCard.jsx:233-246's, which is this repo's existing
 * filter trigger: a funnel, and a count pill only when something is on. Two
 * differences, both deliberate: the label is VISIBLE here (that button sits in
 * a toolbar beside a search field which explains it; this one sits alone on a
 * row and an unlabelled funnel is a guess), and the pill is the shadcn Badge
 * rather than a hand-rolled span.
 */
export function FilterSheetTrigger({
  /** The VISIBLE word. In `default` it names the control ("Filter by"); in
      `chip` it names the CURRENT SELECTION ("All", "Water", "3 filters"). */
  label = FILTER_BY,
  /** How many CONSTRAINTS are in force. Drives the count pill, the accessible
      name and `data-active-filters` in both variants. */
  count = 0,
  /* OPTIONAL, ADDED 2026-11-04 for the valve screen, and off by default so
     /alerts is untouched. When the caller can name WHICH constraint is on in
     one short phrase, that phrase replaces the count pill - it is strictly
     more information in the same pixels, and the count is still in the
     accessible name either way. The valve screen's case is the `?state=open`
     deep link: landing on 2 rows out of 103 under a bare "1" is a mystery,
     under "Open" it is not. Past one constraint the caller falls back to a
     count phrase of its own, because two labels on a 361px row is a guess
     about which matters more. */
  summary,
  /* OPT-IN, ADDED 2026-11-04 for /alerts, and `default` keeps every existing
     caller byte-identical - the same way `summary`, `searchable` and
     `selectAll` were added.

     'chip' is the compact SELECTOR Figma 199532:87604 draws at the left of the
     /alerts filter row, 117x30: the same funnel, the CURRENT SELECTION as the
     visible word instead of "Filter by", the number of rows that selection
     yields, and an 18px chevron-down. The chevron is what makes it read as a
     selector rather than as a toggle - it is the mark that announces the word
     beside it can change - and it is why this is a variant and not a `summary`
     on the existing button: `summary` adds a badge to a control still labelled
     "Filter by", which is a different shape from a control labelled "All". */
  variant = 'default',
  /* 'chip' only. How many rows the CURRENT selection yields - the frame draws
     `25` beside `All` over a list of 25. Copy standard §4: the number on a
     control is what that control will DO. It is deliberately NOT the count of
     constraints, which is `count`. Decoration on the name: the readout beside
     the chip is what says this number out loud. */
  resultCount,
  onClick,
  className,
  /* The hook tests and screenshots query by. Defaulted to what /alerts already
     ships so that caller does not move. */
  dataName = 'alerts-filter-trigger',
}) {
  const chip = variant === 'chip'
  /* SystemsTableCard's accessible name, verbatim, for the default variant. The
     count has to be IN the name: a bare "Filter by" on a button that is
     currently holding two constraints tells a screen-reader user the list is
     unfiltered. The NAME never carries the summary: a name that changed every
     time a filter moved would make the one door on a screen unaddressable.

     THE CHIP HAS TO SAY BOTH, because its visible word is "All" / "Water" and
     not "Filter by". WCAG 2.5.3 Label in Name: a control whose accessible name
     does not contain its visible label cannot be addressed by speech input, and
     "All" on its own names nothing. So the chip's name is the control's noun
     AND the selection. The ROW count stays out of it on purpose - a name that
     moved with the data would make this door unaddressable, and the readout
     beside the chip already says the number in words. */
  const accessibleName = chip
    ? (count ? `${FILTER_BY}: ${label} (${num(count)} active)` : `${FILTER_BY}: ${label}`)
    : (count ? `${label} (${num(count)} active)` : label)

  if (chip) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-label={accessibleName}
        className={cn(
          /* 30px and an 11px inset are the node's. NOT shrink-0: the word is
             the caller's data and a selector that cannot shrink pushes the
             readout beside it off the row (scripts/check-text-overflow.mjs). */
          'h-[30px] min-w-0 cursor-pointer gap-[6px] rounded-md border-solid bg-card px-[11px]',
          'text-sm font-medium leading-5 text-foreground',
          className,
        )}
        data-name={dataName}
        data-active-filters={count || undefined}
      >
        <FunnelSimple size={16} className="shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
        {resultCount != null ? (
          <span
            aria-hidden="true"
            className="shrink-0 font-normal tabular-nums text-muted-foreground"
            data-name="filter-trigger-result-count"
          >
            {num(resultCount)}
          </span>
        ) : null}
        <ChevronDown size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={accessibleName}
      className={cn(
        'h-[32px] shrink-0 cursor-pointer gap-[6px] rounded-md border-solid bg-card px-[12px]',
        'text-sm font-medium leading-5 text-foreground',
        className,
      )}
      data-name={dataName}
      data-active-filters={count || undefined}
    >
      <FunnelSimple size={16} className="shrink-0" />
      <span className="shrink-0">{label}</span>
      {count && summary ? (
        <>
          {/* `data-[orientation=vertical]:h-4` rather than a bare `h-4`:
              separator.jsx ships `data-[orientation=vertical]:h-full` and an
              unprefixed utility cannot beat an attribute-selector one, so the
              rule would run the button's full height and touch its border.
              Same modifier, same property, so twMerge drops the primitive's. */}
          <Separator
            orientation="vertical"
            className="mx-[2px] data-[orientation=vertical]:h-4"
          />
          <Badge
            aria-hidden="true"
            variant="secondary"
            className="min-w-0 shrink truncate font-normal"
            data-name="filter-trigger-summary"
          >
            {summary}
          </Badge>
        </>
      ) : count ? (
        <Badge
          aria-hidden="true"
          className="h-[18px] min-w-[18px] justify-center px-[5px] text-[11px] leading-[14px] tabular-nums"
        >
          {num(count)}
        </Badge>
      ) : null}
    </Button>
  )
}

export default function FilterSheet({
  open,
  title = 'Filter by',
  groups = [],
  value,
  onApply,
  onClose,
  onClear,
  /* Translated by the CALLER, because the catalogue has a key for it
     (`alerts.filters.clear`) and this file deliberately owns no copy of its
     own. The default is that entry's English, for a caller without i18n. */
  clearLabel = CLEAR_LABEL,
  className,
}) {
  const [draft, setDraft] = useState(value ?? {})
  /* THE SEARCH IS LOCAL TO THIS SURFACE AND DIES WITH IT. It narrows which
     options are DRAWN and never which are PICKED, so an abandoned search can
     never leave a constraint behind. One term per group, keyed by group id,
     cleared with the draft on every open for the same reason the draft is
     re-seeded. */
  const [searchTerms, setSearchTerms] = useState({})
  const headingId = useId()
  const headingRef = useRef(null)

  /* Re-seed from the live filter each time the sheet OPENS, so a Cancel
     followed by a re-open does not resurrect the abandoned draft. Keyed on
     `open` alone: re-seeding on every `value` identity change would wipe the
     draft mid-edit. SystemsFilterSheet:71 makes the same call. */
  useEffect(() => {
    if (!open) return
    setDraft(value ?? {})
    setSearchTerms({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* Focus lands on the heading, which is the one thing this file can do about
     `aria-modal` from inside its own subtree. See the header. */
  useEffect(() => {
    if (open) headingRef.current?.focus()
  }, [open])

  if (!open) return null

  const shownGroups = groups.filter((g) => (g.visible ? g.visible(draft) : true))

  const setGroup = (id, next) => setDraft((d) => ({ ...d, [id]: next }))

  const toggleMulti = (id, optionValue) => {
    const picked = draft[id] ?? []
    setGroup(id, picked.includes(optionValue)
      ? picked.filter((v) => v !== optionValue)
      : [...picked, optionValue])
  }

  /* A GROUP SELECT-ALL REACHES EXACTLY THE OPTIONS ON SCREEN, which under a
     search is the MATCHING ones and not the whole group. THE NUMBER ON A
     CONTROL IS WHAT THE CONTROL WILL DO: a press that silently ticked fourteen
     locations the search had hidden is the footgun a filter surface over a
     bulk-action screen must not have. Values OUTSIDE the current search are
     left exactly as they are, in both directions - unticking a narrowed group
     never clears a choice the user cannot currently see. */
  const toggleAll = (id, values) => {
    const picked = draft[id] ?? []
    const all = values.length > 0 && values.every((v) => picked.includes(v))
    setGroup(
      id,
      all ? picked.filter((v) => !values.includes(v)) : [...new Set([...picked, ...values])],
    )
  }

  const clear = () => {
    if (onClear) { onClear(); return }
    const next = {}
    groups.forEach((g) => {
      next[g.id] = g.mode === 'multi' ? [] : g.options?.[0]?.value
    })
    setDraft(next)
    setSearchTerms({})
  }

  return (
    <div
      className={cn('absolute inset-0 z-50 flex flex-col justify-end', className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose?.() }}
    >
      {/* Scrim. A tap outside is a Cancel, not an Apply. */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-foreground/45"
      />

      {/* bg-surface-card, matching the widgets it filters, rather than
          shadcn's plain white - the sheet is part of this app, not the
          library demo. SystemsFilterSheet:122 makes the same call. */}
      <div className="relative flex max-h-[85%] flex-col overflow-hidden rounded-t-[18px] bg-surface-card">
        <div className="flex shrink-0 items-center gap-[8px] border-b border-solid border-border px-[16px] py-[12px]">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="min-w-0 flex-1 truncate text-sm font-semibold uppercase leading-5 tracking-[0.4px] text-muted-foreground outline-none"
          >
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close filters"
            onClick={onClose}
            className="size-[28px] shrink-0 cursor-pointer rounded-[8px] text-muted-foreground"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-[4px]">
          {shownGroups.map((group, i) => {
            const term = (searchTerms[group.id] ?? '').trim().toLowerCase()
            const searching = Boolean(group.searchable) && term.length > 0
            const options = searching
              ? (group.options ?? []).filter((o) =>
                  searchTextOf(o).toLowerCase().includes(term),
                )
              : (group.options ?? [])
            const values = options.map((o) => o.value)
            const pickedInGroup = draft[group.id] ?? []
            const allPicked = values.length > 0 && values.every((v) => pickedInGroup.includes(v))
            const somePicked = values.some((v) => pickedInGroup.includes(v))
            return (
            <div key={group.id} data-name={`filter-group-${group.id}`}>
              {i > 0 ? <Separator className="my-[4px]" /> : null}
              <div className="flex items-center justify-between gap-2 px-[16px] pb-[4px] pt-[8px]">
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold uppercase leading-4 tracking-[0.4px] text-muted-foreground">
                  {group.label}
                </p>
                {/* OPT-IN PER GROUP, ADDED 2026-11-04. A `<label>` only
                    forwards a click to a LABELABLE element and Radix's
                    Checkbox is a `<button role="checkbox">`, so the forward is
                    explicit, with a guard so a press ON the box does not
                    toggle twice. Without it the only hit target would be the
                    18px box, which is under every touch-target floor. */}
                {group.selectAll && group.mode !== 'single' ? (
                  <span
                    role="presentation"
                    onClick={(e) => {
                      if (e.target?.closest?.('[data-slot="checkbox"]')) return
                      toggleAll(group.id, values)
                    }}
                    className="flex shrink-0 cursor-pointer items-center gap-2 py-1"
                  >
                    <Checkbox
                      checked={allPicked ? true : somePicked ? 'indeterminate' : false}
                      onCheckedChange={() => toggleAll(group.id, values)}
                      aria-label={`Select all ${num(values.length)} ${group.label.toLowerCase()} options`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {`All ${num(values.length)}`}
                    </span>
                  </span>
                ) : null}
              </div>

              {/* OPT-IN PER GROUP, ADDED 2026-11-04. One list on one screen is
                  long enough to need finding rather than scanning - the valve
                  screen's 17 leaf locations, unbounded in production - and the
                  owner asked for it on that list and no other: "Make search
                  for locations, all the rest doesn't need any search." A box
                  over a two-option group would be a control with nothing to
                  do. */}
              {group.searchable && group.mode !== 'single' ? (
                <div className="relative px-[16px] py-[4px]">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-[28px] size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type="search"
                    value={searchTerms[group.id] ?? ''}
                    onChange={(e) =>
                      setSearchTerms((t) => ({ ...t, [group.id]: e.target.value }))
                    }
                    /* The caller's copy. A placeholder is NOT a label - it
                       disappears the moment the user types, which is exactly
                       when the control still has to have a name - so the same
                       string is said out loud as well. */
                    placeholder={group.searchLabel}
                    aria-label={group.searchLabel}
                    /* `text-foreground` for the same reason as the option
                       titles below: `input.jsx` names no colour either, so the
                       typed term would be black on the dark card. */
                    className="pl-8 text-foreground"
                  />
                </div>
              ) : null}

              {/* A FILTERED LIST SAYS IT IS FILTERED. Copy standard §4: a
                  truncated list states its truncation, because a silent cut
                  reads as "this is everything" - here, as "this account only
                  has four locations". ABOVE the list rather than under it:
                  under a 15-hit search the note would be a scroll away from
                  the thing it is about. */}
              {searching && options.length > 0 ? (
                <p
                  className="px-[16px] pb-[4px] text-xs text-muted-foreground"
                  data-name={`filter-search-note-${group.id}`}
                >
                  {`Showing ${num(options.length)} of ${num(group.options.length)}`}
                </p>
              ) : null}

              {group.mode === 'single' ? (
                <div className="px-[16px] py-[6px]">
                  <ToggleGroup
                    type="single"
                    spacing={3}
                    value={draft[group.id] ?? group.options?.[0]?.value}
                    /* Radix single-select emits '' when the pressed item is
                       pressed again; this control has no "neither" state. */
                    onValueChange={(v) => { if (v) setGroup(group.id, v) }}
                    aria-label={group.label}
                    className="inline-flex h-9 w-full items-stretch justify-center gap-0 rounded-lg bg-slate-200 p-[3px]"
                  >
                    {group.options.map((o) => (
                      <ToggleGroupItem
                        key={o.value}
                        value={o.value}
                        className={SEG_CHIP}
                      >
                        <span className="min-w-0 truncate">{o.label}</span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              ) : options.length === 0 ? (
                /* An empty list with nothing said over it reads as a broken
                   control rather than as a group with nothing in it, or a
                   search with no hits. Both strings are the CALLER'S. */
                <p className="px-[16px] py-[12px] text-sm text-muted-foreground">
                  {searching ? group.searchEmptyLabel : group.emptyLabel}
                </p>
              ) : (
                options.map((o) => {
                  const picked = pickedInGroup.includes(o.value)
                  return (
                    /* asChild so the ROW is the <label> and the Checkbox is
                       the real control: a Radix checkbox nested inside a
                       <button> row would be a control inside a control. */
                    <Item key={o.value} size="sm" asChild>
                      <label className="cursor-pointer hover:bg-accent/40">
                        <Checkbox
                          checked={picked}
                          onCheckedChange={() => toggleMulti(group.id, o.value)}
                          /* OPTIONAL, ADDED 2026-11-04. Without it the row's
                             own <label> names the control, which is right for
                             a bare option; a caller that wants the count said
                             aloud in its own units ("320 Summit Blvd, 5
                             systems") supplies the sentence rather than this
                             file inventing a noun for it. */
                          aria-label={o.name}
                        />
                        <ItemContent className="min-w-0 gap-0">
                          {/* `text-foreground` IS LOAD-BEARING AND WAS MISSING.
                              `ItemTitle` names no colour, and nothing between
                              here and <body> does either - `body` is a literal
                              `rgb(0,0,0)` under ALL FOUR themes. Measured in a
                              real frame on 2026-11-04: the option words
                              computed to pure black on the dark card, i.e. the
                              content of this surface was unreadable in `dark`
                              and close to it in `contrast`. A utility that
                              resolves identically in all four themes is the
                              tell `index.css` warns about; this one resolved
                              to black because it resolved to nothing. */}
                          <ItemTitle className="min-w-0 truncate font-normal text-foreground">
                            {o.label}
                          </ItemTitle>
                        </ItemContent>
                        {/* OPTIONAL, ADDED 2026-11-04: how many rows this
                            option would yield. SystemsFilterSheet:245-247
                            states the reason in as many words - "a checkbox
                            that silently returns nothing is the complaint this
                            whole tab started from". */}
                        {o.count != null ? (
                          <Badge variant="secondary" className="shrink-0 tabular-nums">
                            {num(o.count)}
                          </Badge>
                        ) : null}
                      </label>
                    </Item>
                  )
                })
              )}

            </div>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-[8px] border-t border-solid border-border px-[16px] py-[12px]">
          <Button
            type="button"
            variant="ghost"
            onClick={clear}
            className="h-[36px] cursor-pointer px-[12px] text-sm font-medium leading-5 text-muted-foreground"
          >
            {clearLabel}
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            /* `text-foreground` again: the `outline` Button variant sets a
               border and a background per theme but no ink, so Cancel
               inherited `body`'s literal black and vanished into the dark
               card beside a fully legible Apply. */
            className="h-[36px] cursor-pointer rounded-lg px-[16px] text-sm font-medium leading-5 text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onApply?.(draft)}
            className="h-[36px] cursor-pointer rounded-lg px-[16px] text-sm font-medium leading-5"
          >
            Apply filter
          </Button>
        </div>
      </div>
    </div>
  )
}
