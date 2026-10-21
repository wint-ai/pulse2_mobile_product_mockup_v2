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
 * WHAT THE NODE FIXES
 *   grid          minmax(0,1fr) 80px 56px  — identity, one badge, one action
 *   TableHead     h-40, first cell pl-16 pr-8
 *   TableCell     h-64 min-h-40 gap-8 p-8, first pl-16, last pr-16
 *   identity      32px round avatar + name 14/20 medium over sub 12/16 muted
 *   badge         h-20 px-8 py-2 radius 26, text 12/16 medium
 *   toolbar       title 20/28 semibold + description, then a search row
 *   pagination    h-52 pt-16, "Page 1 of 7" against « ‹ › »
 *
 * THE 8-TO-3 PROBLEM
 * The content spec (198736:52372) is the DESKTOP table: 1140px wide, eight
 * columns — System, Location, Leak, Valve State, Water Flow, Comm, Power, Life
 * Cycle. Table 16 gives three. The resolution chosen was: show System and Leak,
 * and let the 56px cell expand the row in place for the rest, so every field
 * still lives inside the table and nothing scrolls sideways.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   - Water Flow and Life Cycle. Neither has a field in the dataset and the
 *     rule for deriving them is still owed, so they are absent rather than
 *     invented. See the pending note on the detail list below.
 *   - The device TYPE as a text sub-line. The type is carried by the row's
 *     ICON instead (SystemTypeIcon — the same three glyphs the health card
 *     draws on its "Systems types" chips), which is where the desktop puts it
 *     too, and the site name takes the text line because it actually varies.
 *     Against today's dataset every system resolves to Flow Monitoring: every
 *     record carries a water meter and none carries a flood or humidity
 *     device, which is the same fact HomeAllAccounts reports as flood: 0 /
 *     humidity: 0. See src/data/systemType.js.
 *   - The node's primary "Add member" button. There is no add-system action in
 *     this mockup and a control that does nothing is worse than no control.
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
import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FunnelSimple, Search01 } from '@/v2/icons'
import SystemTypeIcon from '@/v2/components/SystemTypeIcon'
import { activeFilterCount, applyFilters } from '@/data/systemFilters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* The node's own row count. 103 systems at six a page is a lot of paging, but
   the page size is the comp's and is trivially changed if it proves wrong. */
const PAGE_SIZE = 6

/* Value domains, all straight off the system record built in
   src/data/upstream/buildTree.js. Anything outside them renders as an em dash
   rather than the raw token. */
const VALVE_LABEL = { open: 'Open', closed: 'Closed', error: 'Error' }
const COMM_LABEL = { online: 'Online', offline: 'Offline' }
const POWER_LABEL = { ac: 'AC', battery: 'Battery', 'ac-lost': 'AC lost' }

const DASH = '—'

/* Leak is the one column that survives into the 80px slot, so it carries the
   tone. High is the node's destructive treatment verbatim; Low takes the
   orange the water-events card already uses for a low-flow event, so the two
   surfaces agree about what "low" looks like. */
const LEAK_TONE = {
  high: 'bg-[rgba(229,0,11,0.1)] text-destructive',
  low: 'bg-[var(--orange-100)] text-orange-600',
}
const LEAK_LABEL = { high: 'High', low: 'Low' }

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

/* I176511:26285;2770:33899 — DataTablePagination. The four buttons are
   first / previous / next / last, and each carries the disabled ATTRIBUTE at
   the ends rather than a dimmed-but-operable look, which is the rule the
   consumption card's pager already follows. */
function PagerButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-[32px] shrink-0 items-center justify-center rounded-md',
        'border border-solid border-border',
        'text-foreground outline-none',
        'hover:bg-slate-100',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent',
      )}
    >
      {children}
    </button>
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
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState(null)

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

  /* A newly applied filter can strand the viewer the same way a search can;
     pageCount below clamps for both, so nothing extra is needed here. */

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  /* A narrowed search or a change of location can leave the viewer on a page
     that no longer exists — page 7 of a 2-page result is an empty table, not a
     filter that found nothing. Clamped during RENDER rather than corrected in
     an effect: an effect would paint the empty page first and then the right
     one, and react-hooks/set-state-in-effect rightly refuses it. */
  const safePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className={cn('flex w-full flex-col gap-4', className)}>
      {/* DataTableToolbar — I176511:26285;2770:33989 */}
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-0.5">
          <div className="flex items-baseline gap-[8px]">
            <h2 className="font-semibold tracking-[-0.5px] text-xl leading-7 text-foreground">
              {title}
            </h2>
            <span className="flex h-[20px] min-w-[24px] items-center justify-center rounded-[26px] bg-slate-100 px-2 text-[12px] font-medium leading-4 text-slate-600">
              {systems.length}
            </span>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>

        {/* The node's Right row. Its primary button is dropped (see the header
            docblock); the search is real and filters the rows below. */}
        <div className="flex w-full items-center gap-2">
          <div className="flex h-[32px] w-full items-center gap-[8px] rounded-md border border-solid border-neutral-200 bg-card px-[12px]">
            <Search01 size={16} className="shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
                setOpenId(null)
              }}
              aria-label="Search systems"
              placeholder="Search systems..."
              className="w-full min-w-0 bg-transparent text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          {onOpenFilters ? (
          <button
            type="button"
            onClick={onOpenFilters}
            aria-label={activeFilters ? `Filter by (${activeFilters} active)` : 'Filter by'}
            className="relative flex h-[32px] shrink-0 items-center gap-[6px] rounded-md border border-solid border-neutral-200 bg-card px-[12px] text-sm font-medium leading-5 text-foreground outline-none hover:bg-slate-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <FunnelSimple size={16} className="shrink-0" />
            {activeFilters ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-[5px] text-[11px] font-medium leading-[14px] text-white">
                {activeFilters}
              </span>
            ) : null}
          </button>
          ) : null}
        </div>
      </div>

      {/* table — I176511:26285;2770:33345 */}
      {/* GROUND. Two separate things were wrong here.
          First, Figma draws Table 16 on --background and lets the table inherit
          it, so its codegen emits no fill at all — on this app's gradient
          screen that left every row transparent.
          Second, the fix reached for shadcn's default white on #e4e4e7 at
          radius 14, which is not what this app's cards look like. Every other
          widget on this screen — water events, systems health, insights, top
          usage — is #fafbfc on a WHITE border at radius 18. The table is a
          widget on that screen, so it takes that palette and stops being the
          one panel wearing the library's defaults. */}
      <div className="w-full overflow-clip rounded-[18px] border border-solid border-white bg-[#fafbfc]">
        <Table className="table-fixed">
          {/* The node's grid track, as real columns. */}
          <colgroup>
            <col />
            <col className="w-[80px]" />
            <col className="w-[56px]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-[40px] pl-4 pr-2 text-sm leading-5">
                System
              </TableHead>
              <TableHead className="h-[40px] px-2 text-sm leading-5">
                Leak
              </TableHead>
              <TableHead className="h-[40px] pl-2 pr-4">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={3}
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
                const leak = LEAK_LABEL[s.leak] ? s.leak : null

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
                        at about fifteen characters. */}
                    <TableCell className="min-h-[40px] py-2 pl-4 pr-2 whitespace-normal">
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

                    {/* col-2 — the one status that survives the 80px slot. */}
                    <TableCell className="h-[64px] p-2 align-middle">
                      {leak ? (
                        <StatusBadge tone={LEAK_TONE[leak]}>{LEAK_LABEL[leak]}</StatusBadge>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">
                          {DASH}
                        </span>
                      )}
                    </TableCell>

                    {/* col-3 — the disclosure. */}
                    <TableCell className="h-[64px] min-h-[40px] py-2 pl-2 pr-4">
                      <span
                        aria-hidden="true"
                        className="flex size-[24px] items-center justify-center text-muted-foreground"
                      >
                        <ChevronDown
                          size={16}
                          className={cn('transition-transform', open && 'rotate-180')}
                        />
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* The other five columns of the desktop spec, in place.
                      A second <tr> spanning the track is how a table carries a
                      disclosure without breaking its own column semantics. */}
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={3}
                        className="px-4 pt-0 pb-3 whitespace-normal"
                      >
                        <div className="flex flex-col border-t border-solid border-border pt-2">
                          <DetailRow label="Location">
                            <span className="block">{s.l4Name || DASH}</span>
                            {s.address && s.address !== s.l4Name ? (
                              <span className="block text-muted-foreground">
                                {s.address}
                              </span>
                            ) : null}
                          </DetailRow>
                          <DetailRow label="Valve state">
                            {s.valve == null ? 'No valve' : (VALVE_LABEL[s.valve] ?? DASH)}
                          </DetailRow>
                          <DetailRow label="Comm">{COMM_LABEL[s.comm] ?? DASH}</DetailRow>
                          <DetailRow label="Power">{POWER_LABEL[s.power] ?? DASH}</DetailRow>
                          {/* PENDING: Water Flow and Life Cycle. The desktop
                              spec carries both; this dataset has no field for
                              either and the derivation rule is owed, so they
                              are omitted rather than synthesised. Add two
                              DetailRows here once the rule lands. */}

                          {onOpenSystem ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenSystem(s)
                              }}
                              className="mt-2 flex h-[32px] w-full items-center justify-center rounded-md bg-slate-100 text-sm font-medium leading-5 text-foreground outline-none hover:bg-slate-200 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                              Open system page
                            </button>
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
      </div>

      {/* DataTablePagination — I176511:26285;2770:33899 */}
      <div className="flex h-[52px] w-full items-center justify-between pt-4">
        <p className="pl-2 text-sm leading-5 text-foreground whitespace-nowrap">
          Page {safePage + 1} of {pageCount}
        </p>
        <div className="flex items-center gap-2">
          <PagerButton label="First page" disabled={safePage === 0} onClick={() => setPage(0)}>
            <ChevronsLeft size={16} />
          </PagerButton>
          <PagerButton
            label="Previous page"
            disabled={safePage === 0}
            onClick={() => setPage(Math.max(0, safePage - 1))}
          >
            <ChevronLeft size={16} />
          </PagerButton>
          <PagerButton
            label="Next page"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
          >
            <ChevronRight size={16} />
          </PagerButton>
          <PagerButton
            label="Last page"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(pageCount - 1)}
          >
            <ChevronsRight size={16} />
          </PagerButton>
        </div>
      </div>

    </div>
  )
}
