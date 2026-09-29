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
  high: 'bg-[rgba(229,0,11,0.1)] text-[color:var(--destructive,#e7000b)]',
  low: 'bg-[var(--colors\\/orange\\/100,#ffedd4)] text-[color:var(--colors\\/orange\\/600,#f54a00)]',
}
const LEAK_LABEL = { high: 'High', low: 'Low' }

/** I176511:26285;...;176511:32132 — h-20, px-8, py-2, radius 26, 12/16 medium. */
function StatusBadge({ tone, children }) {
  return (
    <span
      className={cn(
        'flex h-[20px] shrink-0 items-center justify-center gap-[var(--component\\/badge\\/gap,4px)]',
        'overflow-clip px-[var(--component\\/badge\\/px,8px)] py-[var(--component\\/badge\\/py,2px)]',
        'rounded-[var(--component\\/badge\\/radius,26px)]',
        'text-[12px] font-medium leading-[var(--text\\/xs\\/lh,16px)] whitespace-nowrap',
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
      <span className="shrink-0 text-[12px] leading-[var(--text\/xs\/lh,16px)] text-[color:var(--muted-foreground,#71717a)]">
        {label}
      </span>
      <span className="min-w-0 text-right text-[12px] leading-[var(--text\/xs\/lh,16px)] text-[color:var(--foreground,#09090b)]">
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
        'flex size-[32px] shrink-0 items-center justify-center rounded-[var(--component\\/button\\/size-default\\/radius,8px)]',
        'border-[length:var(--border-width\\/border,1px)] border-solid border-[var(--border,#e4e4e7)]',
        'text-[color:var(--foreground,#09090b)] outline-none',
        'hover:bg-[var(--colors\\/slate\\/100,#f1f5f9)]',
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
    <div className={cn('flex w-full flex-col gap-[var(--spacing\\/4,16px)]', className)}>
      {/* DataTableToolbar — I176511:26285;2770:33989 */}
      <div className="flex w-full flex-col gap-[var(--pro\/space\/5,16px)]">
        <div className="flex w-full flex-col gap-[var(--pro\/space\/0\,5,2px)]">
          <div className="flex items-baseline gap-[8px]">
            <h2 className="font-semibold tracking-[var(--text\/xl\/heading-tracking,-0.5px)] text-[length:var(--text\/xl\/size,20px)] leading-[var(--font\/line-height\/leading-7,28px)] text-[color:var(--foreground,#0a0a0a)]">
              {title}
            </h2>
            <span className="flex h-[20px] min-w-[24px] items-center justify-center rounded-[var(--component\/badge\/radius,26px)] bg-[var(--colors\/slate\/100,#f1f5f9)] px-[var(--component\/badge\/px,8px)] text-[12px] font-medium leading-[var(--text\/xs\/lh,16px)] text-[color:var(--colors\/slate\/600,#45556c)]">
              {systems.length}
            </span>
          </div>
          <p className="text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--muted-foreground,#737373)]">
            {description}
          </p>
        </div>

        {/* The node's Right row. Its primary button is dropped (see the header
            docblock); the search is real and filters the rows below. */}
        <div className="flex w-full items-center gap-[var(--component\/data-table\/toolbar\/gap,8px)]">
          <div className="flex h-[32px] w-full items-center gap-[8px] rounded-[var(--component\/input\/radius,8px)] border-[length:var(--component\/input\/border-width,1px)] border-solid border-[var(--component\/input\/border,#e5e5e5)] bg-[var(--component\/input\/bg,white)] px-[12px]">
            <Search01 size={16} className="shrink-0 text-[color:var(--muted-foreground,#737373)]" />
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
              className="w-full min-w-0 bg-transparent text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#0a0a0a)] outline-none placeholder:text-[color:var(--muted-foreground,#737373)]"
            />
          </div>

          {onOpenFilters ? (
          <button
            type="button"
            onClick={onOpenFilters}
            aria-label={activeFilters ? `Filter by (${activeFilters} active)` : 'Filter by'}
            className="relative flex h-[32px] shrink-0 items-center gap-[6px] rounded-[var(--component\/button\/size-default\/radius,8px)] border-[length:var(--border-width\/border,1px)] border-solid border-[var(--component\/input\/border,#e5e5e5)] bg-[var(--component\/input\/bg,white)] px-[12px] text-[length:var(--text\/sm\/size,14px)] font-medium leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#0a0a0a)] outline-none hover:bg-[var(--colors\/slate\/100,#f1f5f9)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <FunnelSimple size={16} className="shrink-0" />
            {activeFilters ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--wint-blue-accent,#0b81f8)] px-[5px] text-[11px] font-medium leading-[14px] text-white">
                {activeFilters}
              </span>
            ) : null}
          </button>
          ) : null}
        </div>
      </div>

      {/* table — I176511:26285;2770:33345 */}
      {/* bg is load-bearing here. The node draws this block on --background
          (white) and the table inherits it, so Figma's codegen emits no fill on
          the container. This app's screen is a blue gradient, so inheriting
          meant the rows were transparent and the gradient showed through every
          one of them. The ground has to be stated. */}
      <div className="w-full overflow-clip rounded-[var(--component\/card\/radius,14px)] border-[length:var(--border-width\/border,1px)] border-solid border-[var(--border,#e4e4e7)] bg-[var(--card,white)]">
        <Table className="table-fixed">
          {/* The node's grid track, as real columns. */}
          <colgroup>
            <col />
            <col className="w-[80px]" />
            <col className="w-[56px]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-[40px] pl-[var(--pro\/space\/5,16px)] pr-[var(--component\/data-table\/head\/px,8px)] text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)]">
                System
              </TableHead>
              <TableHead className="h-[40px] px-[var(--component\/data-table\/head\/px,8px)] text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)]">
                Leak
              </TableHead>
              <TableHead className="h-[40px] pl-[var(--component\/data-table\/head\/px,8px)] pr-[var(--pro\/space\/5,16px)]">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={3}
                  className="h-[64px] px-[var(--pro\/space\/5,16px)] text-center text-[length:var(--text\/sm\/size,14px)] whitespace-normal text-[color:var(--muted-foreground,#737373)]"
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
                    <TableCell className="min-h-[40px] py-[var(--component\/data-table\/cell\/padding,8px)] pl-[var(--pro\/space\/5,16px)] pr-[var(--component\/data-table\/cell\/padding,8px)] whitespace-normal">
                      <div className="flex min-w-0 items-center gap-[var(--pro\/space\/2,6px)]">
                        {/* The glyph IS the system type — Flow Monitoring,
                            Flood Sensor or Humidity Sensor — not a generic
                            equipment mark. Same three glyphs the health card
                            draws on its "Systems types" chips, so the two
                            surfaces cannot drift. */}
                        <span className="flex size-[32px] shrink-0 items-center justify-center rounded-[var(--rounded-full,9999px)] bg-[var(--colors\/slate\/100,#f1f5f9)] text-[color:var(--colors\/slate\/500,#62748e)]">
                          <SystemTypeIcon system={s} size={16} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col justify-center">
                          <span className="line-clamp-2 text-[length:var(--text\/sm\/size,14px)] font-medium leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#09090b)]">
                            {s.name}
                          </span>
                          <span className="truncate text-[12px] leading-[var(--text\/xs\/lh,16px)] tracking-[0.12px] text-[color:var(--muted-foreground,#71717a)]">
                            {s.l4Name || s.l2Name || s.l1Name || DASH}
                          </span>
                        </span>
                      </div>
                    </TableCell>

                    {/* col-2 — the one status that survives the 80px slot. */}
                    <TableCell className="h-[64px] p-[var(--component\/data-table\/cell\/padding,8px)] align-middle">
                      {leak ? (
                        <StatusBadge tone={LEAK_TONE[leak]}>{LEAK_LABEL[leak]}</StatusBadge>
                      ) : (
                        <span className="text-[12px] text-[color:var(--muted-foreground,#71717a)]">
                          {DASH}
                        </span>
                      )}
                    </TableCell>

                    {/* col-3 — the disclosure. */}
                    <TableCell className="h-[64px] min-h-[40px] py-[var(--component\/data-table\/cell\/padding,8px)] pl-[var(--component\/data-table\/cell\/padding,8px)] pr-[var(--pro\/space\/5,16px)]">
                      <span
                        aria-hidden="true"
                        className="flex size-[24px] items-center justify-center text-[color:var(--muted-foreground,#71717a)]"
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
                        className="px-[var(--pro\/space\/5,16px)] pt-0 pb-[var(--spacing\/3,12px)] whitespace-normal"
                      >
                        <div className="flex flex-col border-t-[length:var(--border-width\/border,1px)] border-solid border-[var(--border,#e4e4e7)] pt-[var(--spacing\/2,8px)]">
                          <DetailRow label="Location">
                            <span className="block">{s.l4Name || DASH}</span>
                            {s.address && s.address !== s.l4Name ? (
                              <span className="block text-[color:var(--muted-foreground,#71717a)]">
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
                              className="mt-[var(--spacing\/2,8px)] flex h-[32px] w-full items-center justify-center rounded-[var(--component\/button\/size-default\/radius,8px)] bg-[var(--colors\/slate\/100,#f1f5f9)] text-[length:var(--text\/sm\/size,14px)] font-medium leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#09090b)] outline-none hover:bg-[var(--colors\/slate\/200,#e2e8f0)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
      <div className="flex h-[52px] w-full items-center justify-between pt-[var(--spacing\/4,16px)]">
        <p className="pl-[var(--spacing\/2,8px)] text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#09090b)] whitespace-nowrap">
          Page {safePage + 1} of {pageCount}
        </p>
        <div className="flex items-center gap-[var(--spacing\/2,8px)]">
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
