/**
 * The System tab on the location / account entity.
 *
 * SOURCE: Figma "Table 16 - Pro Application Block", variant screenSize=Small
 * (176511:26284). That is the only table in the shadcncraft library drawn at
 * phone width — `Table`, `TableHead` and `DataTable` are plain components with
 * no variants at all, `TableCell`'s variants are cell TYPES (text, checkbox,
 * badge, avatar, action) rather than breakpoints, and Table 1-9 are desktop
 * blocks. Table 16 is the mobile one.
 *
 * WHAT THE NODE FIXES, and what is still authoritative for row chrome
 *   TableHead     h-40, first cell pl-16 pr-8
 *   TableCell     h-64 min-h-40 gap-8 p-8, first pl-16, last pr-16
 *   identity      32px round avatar + name 14/20 medium over sub 12/16 muted
 *   badge         h-20 px-8 py-2 radius 26, text 12/16 medium
 *
 * ── THE 2026-11-08 PASS: "it looks bad" ───────────────────────────────────
 * Owner, on a screenshot of this view:
 *
 *   "this needs a huge improvement. It doesn't look like shadcn component. It
 *    doesn't look part of our systems. The pagination below. It's not the best
 *    practices for mobile app. I think something like show more needs to be
 *    there. ... And we need to add a column management for the table."
 *
 * Four separate things were wrong, and they are worth naming because three of
 * them were invisible in code review and only showed up in a real screenshot:
 *
 *  1. THE ROW DIVIDERS WERE PURE BLACK. `ui/table.jsx`'s `TableRow` emits a
 *     bare `border-b`. Under Tailwind v4 a border utility with no colour
 *     resolves to `currentColor`, not to v3's old gray-200 default — so every
 *     body row drew its divider in the row's own near-black text colour, while
 *     the header row (which names `border-border` at this call site) drew a
 *     correct hairline directly above them. Measured in WebKit:
 *     `rgb(0, 0, 0)` on the body rows against `oklch(0.92876 …)` on the head.
 *     That single defect is most of "it doesn't look like shadcn component".
 *     FIXED AT THE PRIMITIVE (`ui/table.jsx`), not here — see the note there.
 *
 *  2. THE TOOLBAR WAS HAND-ROLLED. A raw `<div>` + `<input type="search">`,
 *     a bare `<button>` for the funnel, a hand-built `<span>` for the count.
 *     `ui/input.jsx`, `ui/button.jsx` and `ui/badge.jsx` all existed and ten
 *     other v2 components already import them. They are imported here now, so
 *     this card is built the way its neighbours are instead of re-picking its
 *     own height, radius, focus ring and border every time.
 *
 *  3. THE CARD WAS NOT A CARD. The title, the toolbar and the pager floated
 *     loose on the page gradient with only the table inside a surface. That is
 *     "it doesn't look part of our systems": every other widget on this screen
 *     — water events, systems health, insights, top usage — is one
 *     `bg-surface-card` / `border-card` / radius-18 panel. This is now one too,
 *     with the table flush inside it. It also answers the clipped-looking top
 *     of the owner's screenshot: a half-scrolled naked input under the header
 *     bar reads as broken, a card edge sliding under it does not.
 *
 *  4. THE PAGER WAS A DESKTOP PATTERN. 103 systems at six a page is 18 pages
 *     of « ‹ › » on a phone, with 32px targets, below the fold. Replaced by a
 *     "Show more" batch, see SHOW MORE below.
 *
 * ── THE 8-TO-3 PROBLEM, AND WHAT REPLACED THE FIXED ANSWER ────────────────
 * The content spec (198736:52372) is the DESKTOP table: 1140px wide, eight
 * columns. Table 16 gives three. The old resolution was fixed: System + Leak +
 * a chevron, with the rest behind the row disclosure. The owner's complaint
 * that "the Leak column is — on every visible row" is what killed it — a fixed
 * single data column is a bet that one field matters to every viewer, and this
 * one loses that bet on most pages.
 *
 * So the THIRD slot is now the viewer's. `systemsTableColumns.js` holds the
 * model: which columns exist, why Water Flow / Life Cycle / Location are not
 * among them, the two-column cap and the reason for it, and the localStorage
 * store. Read that file before changing anything here about columns.
 *
 * WHY THE CHOOSER IS AN INLINE PANEL AND NOT A SHEET
 * The house pattern for "put something behind one control" is an
 * `absolute inset-0` overlay inside the PAGE (SystemsFilterSheet:111,
 * BulkValveConfirmSheet:1030, FilterSheet:402), because Radix's DropdownMenu /
 * Popover / Select / Dialog / Sheet all portal to `document.body` and escape
 * Phone.jsx's fixed 393x852 frame — the prohibition recorded at
 * AccountScreenV2.jsx:644-656. shadcn's stock `DataTableViewOptions` is a
 * DropdownMenu and is therefore unavailable.
 *
 * But that overlay has to be mounted by the PAGE, which is why the filter
 * SHEET is HomeAllAccounts' and only the BUTTON is this card's. A column
 * chooser cannot take that route without a new prop on a page this change is
 * not allowed to touch. It is also the wrong weight for the job: picking two
 * checkboxes is a preference, not a commitment with a Cancel and an Apply.
 * So it is a disclosure INSIDE the card, under the toolbar that opens it —
 * nothing portals, nothing is scrim-ed, and the table it reorders stays on
 * screen underneath while you tick. `Checkbox` is the real shadcn primitive
 * (it renders inline and portals nothing; see the note in ui/checkbox.jsx).
 *
 * ── SHOW MORE ─────────────────────────────────────────────────────────────
 * `shown` is a count, not a page index: tapping appends the next batch instead
 * of replacing the current one, so the row you were looking at stays where it
 * was. It resets to one batch when the search text changes and when the filter
 * selection changes, which is what the old `setPage(0)` did. The control is
 * rendered ONLY while something is left to load, so the last batch leaves no
 * dangling button, and the count line above it always says where you are.
 *
 * The header badge still counts `systems.length` — everything in scope, before
 * search and filters — exactly as it did.
 *
 * TOKENS — Phase 3, docs/TOKENIZATION-PLAN.md (2026-10-21). Every
 * `var(--x, #hex)` in this file has been rewritten to the Tailwind utility
 * that paints the same value, and the fallback DELETED. The fallback was a
 * second, invisible source of truth that won whenever the token was missing,
 * with no warning and no visual tell; removing it makes a missing token fail
 * loudly.
 */
import { Fragment, useId, useMemo, useState } from 'react'
import { ChevronDown, Columns3, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FunnelSimple } from '@/v2/icons'
import SystemTypeIcon from '@/v2/components/SystemTypeIcon'
import { activeFilterCount, applyFilters } from '@/data/systemFilters'
import {
  DASH,
  DATA_COLUMNS,
  LEAK_LABEL,
  LEAK_TONE,
  MAX_DATA_COLUMNS,
  SYSTEM_COLUMN,
  columnText,
  loadColumns,
  saveColumns,
} from '@/v2/components/systemsTableColumns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* HOW MANY ROWS A TAP ADDS — a judgement call, flagged for the owner.
   Rows here are ~96px tall because system names wrap to two lines, so ten is
   roughly two screens of a 393x852 frame: enough that the control is worth
   tapping, little enough that the first paint is not the whole fleet. At the
   largest scope (103 systems) the end is ten taps away, and the count line
   says so the whole way down. The old page size was six, which was Figma's. */
const BATCH = 10

/* THE THOUSANDS SEPARATOR IS A COMMA (`docs/wint-format-standards.md`, binding
   project-wide). The fleet is sized at "around 1000" systems and a bare 1000
   is the number a reader mis-sizes at a glance. */
const num = (n) => Number(n).toLocaleString('en-US')

/* ── COPY ─────────────────────────────────────────────────────────────────
   Four strings here are NEW and are flagged for the owner rather than taken
   from the catalogue, because the catalogue has no entry for either pattern:

     SHOW_MORE       the owner's own words ("something like show more needs to
                     be there"). The repo's existing "Show all" means something
                     different — navigate to a full list — so it is not reused.
     COLUMNS_LABEL   names the chooser, in the toolbar and on the panel.
     ALWAYS_LABEL    why the System box cannot be unticked.
     capLabel()      makes the two-column cap legible instead of letting a tap
                     be silently ignored.

   Everything else on this surface is a string the repo already ships:
   "Showing N of M" is EventsScreen.jsx:384's readout, "(filtered)" is the
   catalogue's `showing_x_of_y`, and "Filter by (N active)" is this card's own
   accessible name, unchanged so the existing tests and any muscle memory on
   the control both survive. */
const SHOW_MORE = 'Show more'
const COLUMNS_LABEL = 'Columns'
const ALWAYS_LABEL = 'Always shown'
const capLabel = (picked) => `${picked} of ${MAX_DATA_COLUMNS} selected`

/* The panel is conditionally rendered rather than kept in the DOM at zero
   height: a `grid-template-rows` collapse leaves its checkboxes tabbable and
   readable to a screen reader while the panel is "closed". The entrance is a
   keyframe because there is no animation library in this app, and it is
   removed outright under `prefers-reduced-motion`. */
const PANEL_CSS = `
@keyframes systems-columns-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: none; }
}
[data-name="systems-columns-panel"] { animation: systems-columns-in 160ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  [data-name="systems-columns-panel"] { animation: none; }
}
`

/** I176511:26285;...;176511:32132 — h-20, px-8, py-2, radius 26, 12/16 medium. */
function StatusBadge({ tone, children }) {
  return (
    <span
      className={cn(
        'flex h-[20px] shrink-0 items-center justify-center gap-1',
        'overflow-clip px-2 py-0.5',
        'rounded-[26px]',
        'text-[12px] font-medium leading-4 whitespace-nowrap',
        tone,
      )}
    >
      {children}
    </span>
  )
}

/** One label/value line inside an expanded row. */
function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-[12px] py-[6px]">
      <span className="shrink-0 text-[12px] leading-4 text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-right text-[12px] leading-4 text-foreground">
        {children}
      </span>
    </div>
  )
}

/** One row of the column chooser. `locked` is System; `blocked` is an unticked
 *  box while the cap is full.
 *
 *  BOTH USE `aria-disabled`, NEVER `disabled`. ui/checkbox.jsx carries the
 *  reasoning: a control that cannot be used FOR A REASON the user needs to
 *  hear stays focusable, because a truly `disabled` control is skipped outright
 *  by some assistive tech and the reason never reaches anyone. It draws as a
 *  dashed outline, which neither checked nor unchecked ever is. */
function ColumnToggle({ label, checked, locked, blocked, note, onToggle }) {
  const inert = locked || blocked
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-2',
        'hover:bg-accent/40',
        inert && 'cursor-default hover:bg-transparent',
      )}
    >
      <Checkbox
        checked={checked}
        aria-disabled={inert || undefined}
        onCheckedChange={() => { if (!inert) onToggle() }}
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm leading-5 text-foreground',
          inert && !locked && 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      {note ? (
        <span className="shrink-0 text-[12px] leading-4 text-muted-foreground">
          {note}
        </span>
      ) : null}
    </label>
  )
}

export default function SystemsTableCard({
  systems = [],
  title = 'Systems',
  description = 'See information about all systems.',
  onOpenSystem,
  /* The filter SHEET is mounted by the page, not here: every wrapper Figma
     emits carries `relative`, so an overlay rendered inside this card would be
     trapped in the tab body instead of covering the phone frame. The card owns
     the button and the narrowing; the page owns the surface. Same split the
     consumption card already uses for its month picker. */
  selection,
  onOpenFilters,
  className,
}) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(BATCH)
  const [openId, setOpenId] = useState(null)
  const [columnsOpen, setColumnsOpen] = useState(false)
  /* Lazy initialiser: localStorage is read once per mount, never on re-render,
     and `loadColumns` never throws — a corrupt value yields the default set. */
  const [columns, setColumns] = useState(loadColumns)
  const panelId = useId()

  /* A CHANGE OF FILTER OR OF SCOPE RESTARTS THE LIST, the same way a change of
     search text does. Adjusted DURING RENDER against the previous prop rather
     than in an effect: an effect would paint the long list first and then the
     short one, and `react-hooks/set-state-in-effect` rightly refuses it. This
     is React's documented "adjusting state when a prop changes" pattern.

     Identity comparison is safe here and is already the assumption elsewhere
     in this file: `systems` is HomeAllAccounts' `useMemo`'d `scopedSystems`
     (HomeAllAccounts.jsx:695) and `selection` is its `useState({})`
     (:1011), so neither changes identity on an unrelated re-render — the
     `filtered` memo below would thrash too if they did. */
  const [prevScope, setPrevScope] = useState({ systems, selection })
  if (prevScope.systems !== systems || prevScope.selection !== selection) {
    setPrevScope({ systems, selection })
    setShown(BATCH)
    setOpenId(null)
  }

  /* Filters narrow first, then the search runs over what survives. The other
     order would let a search box appear to find rows the active filter has
     excluded. The filter sheet still offers options from the UNFILTERED set,
     so a viewer can always widen a choice they have already made. */
  const filtered = useMemo(() => {
    const scoped = applyFilters(systems, selection)
    const q = query.trim().toLowerCase()
    if (!q) return scoped
    return scoped.filter((s) =>
      [s.name, s.l4Name, s.address].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [systems, selection, query])

  const activeFilters = activeFilterCount(selection)

  /* The visible data columns, in DATA_COLUMNS order, already capped and
     already validated by the store. `visible.length + 2` is the real column
     count: the identity cell and the disclosure cell are always there. */
  const visible = DATA_COLUMNS.filter((c) => columns.includes(c.id))
  const colSpan = visible.length + 2

  /* The disclosure carries exactly what the table does NOT. A detail line that
     repeats a column the viewer can already see is noise, and the whole point
     of the chooser is that which lines those are now moves. */
  const hidden = DATA_COLUMNS.filter((c) => !columns.includes(c.id))

  /* `shown` is clamped by the slice itself, so a search that shrinks the
     result can never strand the viewer on an empty table. */
  const rows = filtered.slice(0, shown)
  const more = filtered.length - rows.length
  const narrowed = Boolean(query.trim()) || activeFilters > 0

  const toggleColumn = (id) => {
    const next = columns.includes(id)
      ? columns.filter((c) => c !== id)
      : [...columns, id]
    /* Re-read through the store's own normaliser so the order on screen is
       always DATA_COLUMNS order and the cap can never be exceeded, whatever
       order the boxes were ticked in. */
    const clean = DATA_COLUMNS.filter((c) => next.includes(c.id))
      .slice(0, MAX_DATA_COLUMNS)
      .map((c) => c.id)
    setColumns(clean)
    saveColumns(clean)
  }

  return (
    <div className={cn('flex w-full flex-col', className)}>
      <style>{PANEL_CSS}</style>

      {/* ONE CARD, the same surface every other widget on this screen wears:
          #fafbfc on a white border at radius 18. See THE CARD WAS NOT A CARD
          in the header docblock — the table used to be the only part of this
          view that sat on a surface, which is what "it doesn't look part of
          our systems" was pointing at. */}
      <div className="w-full overflow-clip rounded-[18px] border border-solid border-card bg-surface-card">
        {/* DataTableToolbar — I176511:26285;2770:33989 */}
        <div className="flex w-full flex-col gap-3 p-4 pb-3">
          <div className="flex w-full flex-col gap-0.5">
            <div className="flex items-baseline gap-[8px]">
              <h2 className="font-semibold tracking-[-0.5px] text-xl leading-7 text-foreground">
                {title}
              </h2>
              {/* The shadcn Badge, not a hand-built span. `secondary` is the
                  count treatment the rest of the app uses for a neutral
                  total. */}
              <Badge
                variant="secondary"
                className="min-w-[24px] justify-center px-2 py-0.5 text-[12px] leading-4"
              >
                {num(systems.length)}
              </Badge>
            </div>
            <p className="text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          </div>

          {/* The node's Right row. Its primary "Add member" button is dropped —
              there is no add-system action in this mockup and a control that
              does nothing is worse than no control. */}
          <div className="flex w-full items-center gap-2">
            <div className="relative min-w-0 flex-1">
              {/* lucide `Search`, which is the glyph the tab bar already draws.
                  NOT `@/v2/icons/Search01`: that export was mirrored — lens at
                  the bottom, handle pointing up and right — so it read as a
                  Mars symbol rather than a magnifying glass. The path data is
                  fixed at source now (see src/v2/icons/Search01.jsx), but this
                  toolbar stays on lucide, because every other shadcn search
                  field in this app (FilterSheet) is on lucide and two search
                  glyphs on one screen should not be two different drawings. */}
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShown(BATCH)
                  setOpenId(null)
                }}
                aria-label="Search systems"
                placeholder="Search systems..."
                /* `text-foreground` because ui/input.jsx names no colour of its
                   own; without it the typed term inherits whatever the card
                   does. Same fix FilterSheet carries on its own search box. */
                className="pl-9 text-sm text-foreground"
              />
            </div>

            {onOpenFilters ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onOpenFilters}
                /* UNCHANGED, deliberately. Two test files and the owner's
                   muscle memory both address this control by this name. */
                aria-label={activeFilters ? `Filter by (${activeFilters} active)` : 'Filter by'}
                /* `border-border` IS LOAD-BEARING. ui/button.jsx's `outline`
                   variant emits a bare `border`, and Tailwind v4 resolves a
                   border utility with no colour to `currentColor` — so an
                   outline Button draws a near-BLACK 1px edge instead of a
                   hairline. It is the same defect that was painting this
                   table's row dividers black (see ui/table.jsx), and it is
                   pre-existing at 31 call sites across the app. It is fixed
                   HERE rather than in the primitive because changing the
                   primitive would restyle every outline button in the product
                   in one go, which is the owner's call and not this card's.
                   REPORTED SEPARATELY. */
                className="relative shrink-0 border-border bg-card"
              >
                <FunnelSimple size={16} />
                {activeFilters ? (
                  <Badge className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] justify-center px-[5px] text-[11px] leading-[14px]">
                    {activeFilters}
                  </Badge>
                ) : null}
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setColumnsOpen((o) => !o)}
              aria-label={COLUMNS_LABEL}
              aria-expanded={columnsOpen}
              aria-controls={panelId}
              /* The NAME stays constant while the panel's contents change. The
                 funnel beside it puts its count in its own name and this one
                 deliberately does not: a control whose accessible name moves
                 every time you tick a box cannot be addressed by speech input
                 twice running. The count is said in the panel instead. */
              /* `border-border` for the same reason as the funnel above. */
              className={cn('shrink-0 border-border bg-card', columnsOpen && 'bg-accent')}
            >
              <Columns3 size={16} />
            </Button>
          </div>

          {columnsOpen ? (
            <div
              id={panelId}
              data-name="systems-columns-panel"
              role="group"
              aria-label={COLUMNS_LABEL}
              className="flex w-full flex-col rounded-lg border border-solid border-border bg-card p-3"
            >
              <div className="flex items-baseline justify-between gap-2 pb-2">
                <p className="text-sm font-medium leading-5 text-foreground">
                  {COLUMNS_LABEL}
                </p>
                {/* THE CAP, SAID OUT LOUD. The alternative — letting a third
                    tap do nothing — is a control that appears broken. */}
                <p
                  className="text-[12px] leading-4 text-muted-foreground"
                  aria-live="polite"
                >
                  {capLabel(visible.length)}
                </p>
              </div>
              <Separator />
              <div className="flex flex-col pt-1">
                <ColumnToggle
                  label={SYSTEM_COLUMN.label}
                  checked
                  locked
                  note={ALWAYS_LABEL}
                  onToggle={() => {}}
                />
                {DATA_COLUMNS.map((c) => {
                  const on = columns.includes(c.id)
                  return (
                    <ColumnToggle
                      key={c.id}
                      label={c.label}
                      checked={on}
                      blocked={!on && visible.length >= MAX_DATA_COLUMNS}
                      onToggle={() => toggleColumn(c.id)}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* table — I176511:26285;2770:33345 */}
        <Table className="table-fixed">
          {/* The node's grid track, as real columns, widened to however many
              data columns the viewer has asked for.

              68px, NOT THE NODE'S 80. Every value these cells can hold is
              short — "Online", "No valve", "Battery", "AC lost", a Low/High
              badge — and the widest of them is about 50px at 12/16, which 68
              clears with the cell's own 8px padding either side. The 12px
              bought back goes to the system name, which is the column that
              actually has a length problem: at 80px the identity cell was
              162px wide and "Basement Supply — Floor 29" clipped to
              "Basement Supply —…" on two lines. Measured in WebKit at 390px.

              44px for the disclosure, narrowed from the node's 56 because the
              mark is `aria-hidden` and the ROW is the control — the 24px
              target the node drew is not a target here. */}
          <colgroup>
            <col />
            {visible.map((c) => (
              <col key={c.id} className="w-[68px]" />
            ))}
            <col className="w-[44px]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-[40px] pl-4 pr-2 text-sm leading-5">
                {SYSTEM_COLUMN.label}
              </TableHead>
              {visible.map((c) => (
                <TableHead
                  key={c.id}
                  className="h-[40px] px-2 text-[12px] leading-4 font-medium"
                >
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="h-[40px] pl-2 pr-4">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colSpan}
                  className="h-[64px] px-4 text-center text-sm whitespace-normal text-muted-foreground"
                >
                  {systems.length === 0
                    ? 'No systems at this location.'
                    : query
                      ? `No system matches “${query}”.`
                      : 'No system matches these filters.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => {
                const open = openId === s.id

                return (
                  <Fragment key={s.id}>
                  <TableRow
                    data-state={open ? 'selected' : undefined}
                    className={cn('cursor-pointer', open && 'border-b-0')}
                    onClick={() => setOpenId(open ? null : s.id)}
                  >
                    {/* col-1 — identity. The node's 32px round avatar becomes a
                        tinted tile: these rows are equipment, not people. */}
                    {/* min-h rather than the node's fixed h-64: system names
                        here run to "Cooling Tower Makeup — Zone 3", and the
                        node was drawn against "Emma Roberts". A fixed height
                        forces a single line, which truncated almost every row
                        at about fifteen characters. `items-start` keeps the
                        glyph pinned to the first line so a two-line name does
                        not drag it down out of line with its neighbours. */}
                    <TableCell className="min-h-[40px] py-2 pl-4 pr-2 align-middle whitespace-normal">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {/* The glyph IS the system type — Flow Monitoring,
                            Flood Sensor or Humidity Sensor — not a generic
                            equipment mark. Same three glyphs the health card
                            draws on its "Systems types" chips, so the two
                            surfaces cannot drift. */}
                        <span className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted-foreground">
                          <SystemTypeIcon system={s} size={16} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col justify-center">
                          <span className="line-clamp-2 text-sm font-medium leading-5 text-foreground">
                            {s.name}
                          </span>
                          <span className="truncate text-[12px] leading-4 tracking-[0.12px] text-muted-foreground">
                            {s.l4Name || s.l2Name || s.l1Name || DASH}
                          </span>
                        </span>
                      </div>
                    </TableCell>

                    {/* The viewer's columns. Leak is the only one that carries
                        a tone — see LEAK_TONE in systemsTableColumns.js for why
                        nothing else gets one. */}
                    {visible.map((c) => {
                      const text = columnText(s, c.id)
                      const tone = c.id === 'leak' && text ? LEAK_TONE[s.leak] : null
                      return (
                        <TableCell
                          key={c.id}
                          className="h-[64px] p-2 align-middle whitespace-normal"
                        >
                          {tone ? (
                            <StatusBadge tone={tone}>{LEAK_LABEL[s.leak]}</StatusBadge>
                          ) : (
                            <span className="block text-[12px] leading-4 text-muted-foreground">
                              {text ?? DASH}
                            </span>
                          )}
                        </TableCell>
                      )
                    })}

                    {/* The disclosure MARK. `aria-hidden`, and not a control:
                        the whole row is the control. */}
                    <TableCell className="h-[64px] min-h-[40px] py-2 pl-2 pr-4 align-middle">
                      <span
                        aria-hidden="true"
                        className="flex size-[20px] items-center justify-center text-muted-foreground"
                      >
                        <ChevronDown
                          size={16}
                          className={cn(
                            'transition-transform motion-reduce:transition-none',
                            open && 'rotate-180',
                          )}
                        />
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Everything the table is NOT currently showing, in place.
                      A second <tr> spanning the track is how a table carries a
                      disclosure without breaking its own column semantics. */}
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={colSpan}
                        className="px-4 pt-0 pb-3 whitespace-normal"
                      >
                        <div className="flex flex-col border-t border-solid border-border pt-2">
                          {/* Location is never a column — it is already the
                              identity cell's sub-line (see the note in
                              systemsTableColumns.js). It stays here because the
                              STREET ADDRESS is the part the table never shows,
                              and that is the line worth opening a row for. */}
                          <DetailRow label="Location">
                            <span className="block">{s.l4Name || DASH}</span>
                            {s.address && s.address !== s.l4Name ? (
                              <span className="block text-muted-foreground">
                                {s.address}
                              </span>
                            ) : null}
                          </DetailRow>
                          {hidden.map((c) => (
                            <DetailRow key={c.id} label={c.label}>
                              {columnText(s, c.id) ?? DASH}
                            </DetailRow>
                          ))}
                          {/* PENDING: Water Flow and Life Cycle. The desktop
                              spec carries both; this dataset has no field for
                              either and the derivation rule is owed, so they
                              are omitted rather than synthesised — and for the
                              same reason they are not offered in the column
                              chooser either. Add them to DATA_COLUMNS in
                              systemsTableColumns.js once the rule lands. */}

                          {onOpenSystem ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenSystem(s)
                              }}
                              className="mt-2 w-full"
                            >
                              Open system page
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* SHOW MORE — replaces DataTablePagination (I176511:26285;2770:33899).
            Rendered only when there are rows to report on: "Showing 0 of 0"
            under an empty-state row is a readout about nothing. */}
        {filtered.length > 0 ? (
          <div className="flex w-full flex-col gap-2 p-4 pt-3">
            {/* The repo's own readout — EventsScreen.jsx:384 builds the same
                sentence, and "(filtered)" is the catalogue's `showing_x_of_y`.
                `aria-live` because tapping Show more otherwise changes the list
                silently. */}
            <p
              className="text-[12px] leading-4 text-muted-foreground"
              aria-live="polite"
              data-name="systems-table-count"
            >
              {`Showing ${num(rows.length)} of ${num(filtered.length)}${narrowed ? ' (filtered)' : ''}`}
            </p>
            {/* NO DANGLING CONTROL. The last batch renders the count alone. */}
            {more > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShown((n) => n + BATCH)}
                className="w-full border-border bg-card"
              >
                {SHOW_MORE}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
