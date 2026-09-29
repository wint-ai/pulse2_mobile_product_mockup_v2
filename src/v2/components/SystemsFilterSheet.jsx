/**
 * "Filter by" for the System tab.
 *
 * The reference is a DESKTOP two-pane popover: a category rail on the left,
 * that category's options on the right, Cancel / Apply filter in the corner.
 * At 393px two panes do not fit side by side, so the same information
 * architecture becomes a drill-down — the rail is the first screen, a category
 * pushes its options over it, and a back control returns. Nothing is dropped;
 * the panes are sequential instead of adjacent.
 *
 * Everything the panel promises is here except two categories. See the note in
 * src/data/systemFilters.js: Water Flow and Status (Life Cycle) have no field
 * on the system record and the derivation rule is still owed, so offering them
 * would mean shipping checkboxes that can only ever return an empty table.
 *
 * The draft is LOCAL until Apply. Cancel restores what was in force, which is
 * what a Cancel button next to an Apply button promises — editing the live
 * filter as the viewer ticks would make Cancel a lie.
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Search01 } from '@/v2/icons'
import SystemTypeIcon from '@/v2/components/SystemTypeIcon'
import { FILTER_CATEGORIES, FILTER_CATEGORY_BY_ID, filterOptions } from '@/data/systemFilters'

/** A tick box drawn to the panel's 16px square, not a native checkbox. */
function CheckBox({ checked, indeterminate }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-[16px] shrink-0 items-center justify-center rounded-[4px] border-[length:var(--border-width\\/border,1px)] border-solid',
        checked || indeterminate
          ? 'border-[var(--wint-blue-accent,#0b81f8)] bg-[var(--wint-blue-accent,#0b81f8)] text-white'
          : 'border-[var(--border,#e4e4e7)] bg-[var(--card,white)]',
      )}
    >
      {indeterminate ? (
        <span className="h-[2px] w-[8px] rounded-full bg-current" />
      ) : checked ? (
        <Check size={12} strokeWidth={3} />
      ) : null}
    </span>
  )
}

export default function SystemsFilterSheet({ open, systems = [], selection, onApply, onClose }) {
  const [draft, setDraft] = useState(selection ?? {})
  const [categoryId, setCategoryId] = useState(null)
  const [query, setQuery] = useState('')

  /* Re-seed from the live filter each time the sheet opens, so a Cancel
     followed by a re-open does not resurrect the abandoned draft. Keyed on
     `open` alone: re-seeding on every `selection` identity change would wipe
     the draft mid-edit. */
  useEffect(() => {
    if (!open) return
    setDraft(selection ?? {})
    setCategoryId(null)
    setQuery('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const category = categoryId ? FILTER_CATEGORY_BY_ID[categoryId] : null
  const options = useMemo(
    () => (categoryId ? filterOptions(systems, categoryId) : []),
    [systems, categoryId],
  )

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => String(o.label).toLowerCase().includes(q))
  }, [options, query])

  if (!open) return null

  const picked = draft[categoryId] ?? []
  const allShownPicked = shown.length > 0 && shown.every((o) => picked.includes(o.value))
  const someShownPicked = shown.some((o) => picked.includes(o.value))

  const toggle = (value) => {
    const next = picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value]
    setDraft({ ...draft, [categoryId]: next })
  }

  const toggleAll = () => {
    const values = shown.map((o) => o.value)
    const next = allShownPicked
      ? picked.filter((v) => !values.includes(v))
      : [...new Set([...picked, ...values])]
    setDraft({ ...draft, [categoryId]: next })
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label="Filter by" aria-modal="true">
      {/* Scrim. A tap outside is a Cancel, not an Apply. */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(15,23,43,0.45)]"
      />

      <div className="relative flex max-h-[85%] flex-col overflow-hidden rounded-t-[var(--rounded-2xl,18px)] bg-[var(--card,white)]">
        <div className="flex shrink-0 items-center gap-[8px] border-b-[length:var(--border-width\/border,1px)] border-solid border-[var(--border,#e4e4e7)] px-[16px] py-[12px]">
          {category ? (
            <button
              type="button"
              aria-label="Back to categories"
              onClick={() => {
                setCategoryId(null)
                setQuery('')
              }}
              className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] text-[color:var(--foreground,#0a0a0a)] outline-none hover:bg-[var(--colors\/slate\/100,#f1f5f9)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ChevronLeft size={16} />
            </button>
          ) : null}

          <h2 className="flex-1 text-[length:var(--text\/sm\/size,14px)] font-semibold uppercase leading-[var(--text\/sm\/lh,20px)] tracking-[0.4px] text-[color:var(--colors\/slate\/500,#62748e)]">
            {category ? category.label : 'Filter by'}
          </h2>

          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] text-[color:var(--muted-foreground,#71717a)] outline-none hover:bg-[var(--colors\/slate\/100,#f1f5f9)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!category ? (
            /* The rail. Each row reports how many values it is holding, so a
               viewer can see what is narrowing the table without opening
               every category one at a time. */
            <ul className="flex flex-col py-[4px]">
              {FILTER_CATEGORIES.map((c) => {
                const n = draft[c.id]?.length ?? 0
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className="flex w-full items-center gap-[8px] px-[16px] py-[12px] text-left outline-none hover:bg-[var(--colors\/slate\/100,#f1f5f9)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <span className="flex-1 text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#0a0a0a)]">
                        {c.label}
                      </span>
                      {n > 0 ? (
                        <span className="flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[var(--wint-blue-accent,#0b81f8)] px-[6px] text-[12px] font-medium leading-[16px] text-white">
                          {n}
                        </span>
                      ) : null}
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-[color:var(--muted-foreground,#71717a)]"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex flex-col">
              {category.searchable ? (
                <div className="px-[16px] pt-[12px]">
                  <div className="flex h-[36px] items-center gap-[8px] rounded-[var(--component\/input\/radius,8px)] bg-[var(--colors\/slate\/100,#f1f5f9)] px-[12px]">
                    <Search01
                      size={16}
                      className="shrink-0 text-[color:var(--muted-foreground,#737373)]"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label={`Search ${category.label.toLowerCase()}`}
                      placeholder={`Search ${category.label.toLowerCase()}...`}
                      className="w-full min-w-0 bg-transparent text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)] outline-none placeholder:text-[color:var(--muted-foreground,#737373)]"
                    />
                  </div>
                </div>
              ) : null}

              {shown.length === 0 ? (
                <p className="px-[16px] py-[20px] text-center text-[length:var(--text\/sm\/size,14px)] text-[color:var(--muted-foreground,#737373)]">
                  Nothing to filter by here.
                </p>
              ) : (
                <ul className="flex flex-col py-[4px]">
                  <li className="border-b-[length:var(--border-width\/border,1px)] border-solid border-[var(--border,#e4e4e7)]">
                    <button
                      type="button"
                      onClick={toggleAll}
                      aria-pressed={allShownPicked}
                      className="flex w-full items-center gap-[12px] px-[16px] py-[12px] text-left outline-none hover:bg-[var(--colors\/slate\/100,#f1f5f9)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <CheckBox
                        checked={allShownPicked}
                        indeterminate={!allShownPicked && someShownPicked}
                      />
                      <span className="text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#0a0a0a)]">
                        Select all
                      </span>
                    </button>
                  </li>

                  {shown.map((o) => (
                    <li key={String(o.value)}>
                      <button
                        type="button"
                        onClick={() => toggle(o.value)}
                        aria-pressed={picked.includes(o.value)}
                        className="flex w-full items-center gap-[12px] px-[16px] py-[12px] text-left outline-none hover:bg-[var(--colors\/slate\/100,#f1f5f9)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <CheckBox checked={picked.includes(o.value)} />
                        {category.iconKind === 'systemType' ? (
                          <SystemTypeIcon
                            type={o.value}
                            size={16}
                            className="flex shrink-0 items-center text-[color:var(--colors\/slate\/500,#62748e)]"
                          />
                        ) : null}
                        <span className="flex-1 truncate text-[length:var(--text\/sm\/size,14px)] leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#0a0a0a)]">
                          {o.label}
                        </span>
                        {/* The count is ours, not the panel's. A checkbox that
                            silently returns nothing is the complaint this
                            whole tab started from. */}
                        <span className="shrink-0 text-[12px] leading-[16px] text-[color:var(--muted-foreground,#71717a)]">
                          {o.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-[8px] border-t-[length:var(--border-width\/border,1px)] border-solid border-[var(--border,#e4e4e7)] px-[16px] py-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[36px] items-center justify-center rounded-[var(--component\/button\/size-default\/radius,10px)] border-[length:var(--border-width\/border,1px)] border-solid border-[var(--border,#e4e4e7)] px-[16px] text-[length:var(--text\/sm\/size,14px)] font-medium leading-[var(--text\/sm\/lh,20px)] text-[color:var(--foreground,#0a0a0a)] outline-none hover:bg-[var(--colors\/slate\/100,#f1f5f9)] focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex h-[36px] items-center justify-center rounded-[var(--component\/button\/size-default\/radius,10px)] bg-[var(--wint-blue-accent,#0b81f8)] px-[16px] text-[length:var(--text\/sm\/size,14px)] font-medium leading-[var(--text\/sm\/lh,20px)] text-white outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Apply filter
          </button>
        </div>
      </div>
    </div>
  )
}
