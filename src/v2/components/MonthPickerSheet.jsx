/**
 * MonthPickerSheet — the "Select month" bottom sheet (v2 mobile).
 *
 * Design source: Figma file YEmjkKS4xaA827Zm8w3oXx. The two frames the task
 * names are 393x852 phone screens; the sheet itself is the SECOND child of
 * each frame, a 393-wide "Popover" instance laid over the system page:
 *
 *   198674:181901  System tab_mobile  →  198674:182898  Popover  (simple)
 *   198674:184354  System tab_mobile  →  198676:185646  Popover  (window)
 *
 * Those two Popover ids are what this file was built from. Worth writing down
 * because finding them cost real Figma quota: get_design_context and
 * get_metadata on either FRAME come back as a bare self-closing root — the
 * page behind the sheet is ~77KB of metadata on its own, over the response
 * cap — which looks exactly like an empty frame and tempts you to conclude the
 * sheet is missing. It is not. forceCode on the frame truncates at Figma's
 * 100KB ceiling partway through the water-consumption card, so the sheet never
 * appears there either. The frames' own child ids are NOT contiguous with the
 * sheet's (the sheet was added after the page was duplicated, in a later edit
 * session, so it carries a different id prefix — 198676 on the second frame),
 * which is why guessing the next id after the page group returns "not found".
 * The cheap way through is one read-only use_figma call listing
 * `frame.children` — 1 call instead of a dozen probes.
 *
 * ── The two variants ──────────────────────────────────────────────────────
 * `variant="simple"`  (198674:182898, 393x345)
 *   Title "Select month", a < 2026 > year stepper, a 4x3 grid of Jan..Dec
 *   chips with one selected, Cancel / Apply.
 *
 * `variant="window"`  (198676:185646, 393x444)
 *   The same, plus the subtitle, chips labelled "Jan 26".."Dec 26", the
 *   12-month window ending at the selection drawn in blue, the end month
 *   itself solid blue, the months AFTER it disabled, and a full-width
 *   "Latest 12 months" button above Cancel / Apply.
 *
 * ── What the PRD added on top of the frames ──────────────────────────────
 * PRD "Water Consumption Chart v2" §2, §3.3, §18, PLS-WC-08:
 *   · `windowMonths` — the frame highlights one cell, which describes a
 *     twelve-bar chart with a single month. All twelve are marked now, and the
 *     end of the window stays visually distinct from the other eleven.
 *   · `footerLabel` — the shortcut's copy is per grouping (`Latest`,
 *     `Latest month`, `Latest 12 months`), not a constant.
 *   · `min` — the frame only disables the future. A series has two ends.
 *   · the dialog names itself from its own title, points at its helper text,
 *     takes focus on open and gives it back on close.
 * The arithmetic all of that needs lives in ./monthPickerModel.js, which is
 * where its tests point; a component module may only export components.
 *
 * ── Why the class names look like this ───────────────────────────────────
 * Every `var(--a\/b,12px)` class is copied out of the Figma design context
 * untouched, and the backslash has to survive into the DOM class attribute:
 * it is what tells Tailwind the slash belongs to the token name and is not an
 * opacity modifier. A literal JSX string attribute preserves it; a JS string
 * literal or a cn() argument eats it at parse time while Tailwind's scanner
 * still sees the escaped form, so the class and the generated selector stop
 * matching and the rule silently does nothing. That is why every Figma class
 * below sits in a literal JSX attribute and every state-dependent bit (chip
 * fill, chip border, label colour, label weight) is an inline style object
 * instead of a conditional class string.
 *
 * ── Where the design's own fallbacks were overridden ─────────────────────
 * Figma emits `var(--name, <fallback>)`. This project DEFINES three of those
 * names in index.css with different values, so `var()` would resolve to the
 * project's number and miss the design. Those three are written as literals:
 *   --foreground        design #0a0a0a / project #0f172b  (title, chip label)
 *   --muted-foreground  design #737373 / project #62748e  (subtitle)
 *   --border            design #e5e5e5 / project #e2e8f0  (sheet hairline)
 * Everything else the sheet touches — colors/slate/*, colors/blue/50,
 * wint-blue-accent, component/*, text/*, spacing/*, p-0 — is undefined here,
 * so the verbatim token class renders the exact design value.
 *
 * The title's line height is the one place the two frames disagree with
 * themselves: the simple frame emits `--text/sm/lh` with a 24px fallback while
 * every other 14px label emits the same token with 20px. The advanced frame
 * spells the title `--text/base/lh, 24px`, which is the token that actually
 * means 24. Both variants use the base token here; rendered pixels are
 * identical (16/24) and one token no longer carries two fallbacks.
 *
 * Shadow: the popover's effect is two drop-shadow layers and layer-2 resolves
 * fully transparent with 0 blur, i.e. nothing. Layer-1 is the visible one and
 * needs spread, which `drop-shadow()` cannot express, so it is a box-shadow.
 *
 * ── Deliberate departures from the render, all of them noted ─────────────
 * 1. The advanced frame puts its subtitle inside a `max-w-[224px]
 *    overflow-clip whitespace-nowrap` trigger, so the render shows it cut off
 *    mid-word ("Pick the last month of the windo…"). The full string is
 *    reproduced here and allowed to wrap. Clipped copy is a design artefact,
 *    not a specification.
 * 2. In the advanced frame May 26 and Jun 26 share one blue-50 parent, so the
 *    10px gutter between those two chips is tinted and the pair reads as one
 *    run. Here each chip owns its own fill, which is right for an arbitrary
 *    window; the only difference is that one 10px gutter.
 * 3. The two nav circles are drawn at 50% opacity in BOTH frames. That is the
 *    design's resting look and it is kept, even though the buttons work.
 *
 * ASSETS: Figma's export URLs expire in ~7 days, so nothing may reference
 * them. The two nav glyphs (Huge Icons / arrow-left-01-round and
 * arrow-right-01-round) are inlined below as 16x16 chevrons, the same
 * geometry and stroke weight the sibling steppers in this project already
 * ship.
 *
 * Nothing mounts this yet. It is self-contained: drop it inside the phone
 * shell (a positioned 393x852 box) and it anchors itself to the bottom edge.
 */

import { useEffect, useId, useRef, useState } from 'react'
import {
  MONTHS,
  chipState,
  normalizePeriod,
  resolveBound,
  serial,
  windowSerials,
  yearNavState,
} from './monthPickerModel'

// ── Palette, as the Figma variables on these two nodes resolve ─────────────
const BLUE = '#0b81f8' // wint-blue-accent
const BLUE_50 = '#eff6ff' // colors/blue/50
const SLATE_100 = '#f1f5f9' // colors/slate/100
const SLATE_600 = '#45556c' // colors/slate/600 — the nav glyph stroke
const FOREGROUND = '#0a0a0a' // design --foreground (NOT the project's #0f172b)
const WHITE = '#ffffff' // --popover, and the end-month label

function clampToDate(month, year) {
  const now = new Date()
  const y = Number.isInteger(year) ? year : now.getFullYear()
  const m = Number.isInteger(month) ? Math.min(11, Math.max(0, month)) : now.getMonth()
  return { month: m, year: y }
}

/* Huge Icons / arrow-left-01-round, as the design draws it at 16px inside the
   32px nav circle. Stroke is currentColor so the circle tints it. */
function ChevronLeft16({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 4L6 8L10 12"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* Huge Icons / arrow-right-01-round. */
function ChevronRight16({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * @param {object}   props
 * @param {'simple'|'window'} [props.variant]  which frame to render.
 * @param {boolean}  [props.open]              mounted-but-hidden is not a thing here; false renders nothing.
 * @param {Function} [props.onClose]           Cancel, the backdrop and Escape all call this.
 * @param {{month:number,year:number}} [props.value]  month is 0-11. Seeds the sheet each time it opens.
 * @param {Function} [props.onApply]           called with { month, year } when Apply is pressed.
 * @param {Function} [props.onSelectLatest12]  'window' only — the "Latest 12 months" shortcut.
 * @param {{month:number,year:number}} [props.max]  the last selectable month (PLS-WC-08).
 *        On 'window' it defaults to `value`, which is what the Figma frame
 *        draws: with Jun 26 selected, Jul 26..Dec 26 are disabled. A caller
 *        with real data should pass the latest month it actually holds.
 * @param {{month:number,year:number}|{y:number,m:number}} [props.min]  the first
 *        selectable month. Months before it are disabled and out of the tab
 *        order, so the picker cannot reach periods the series does not cover
 *        at either end (PLS-WC-08).
 * @param {Array<{y:number,m:number}>} [props.windowMonths]  'window' only —
 *        every month the chart's twelve-month window covers, so the grid marks
 *        the whole window and not just its end (§3.3). Used while the draft
 *        still names the window the card opened on; once the user picks a
 *        different end month the sheet derives the twelve months ending there,
 *        which is what the helper text promises.
 * @param {string} [props.footerLabel]  the footer shortcut's copy, which varies
 *        by grouping (§2): 'Latest' (Hourly), 'Latest month' (Daily),
 *        'Latest 12 months' (Monthly, the default).
 */
export default function MonthPickerSheet({
  variant = 'simple',
  open = false,
  onClose,
  value,
  onApply,
  onSelectLatest12,
  max,
  min,
  windowMonths,
  footerLabel = 'Latest 12 months',
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  /* The body is mounted only while the sheet is open, so its draft state is
     seeded fresh from `value` by every open and torn down on close. That is
     what makes Cancel genuinely discard, with no effect re-syncing props into
     state and no cascading render. */
  return (
    <MonthPickerSheetBody
      variant={variant}
      onClose={onClose}
      value={value}
      onApply={onApply}
      onSelectLatest12={onSelectLatest12}
      max={max}
      min={min}
      windowMonths={windowMonths}
      footerLabel={footerLabel}
    />
  )
}

function MonthPickerSheetBody({
  variant,
  onClose,
  value,
  onApply,
  onSelectLatest12,
  max,
  min,
  windowMonths,
  footerLabel,
}) {
  /* §3.3: the sheet opens with the window's LAST bucket pre-selected — the
     bucket the period label names and the one a pick replaces — and the year
     page it opens on is that bucket's year, so the pre-selection is on screen
     rather than a year away. */
  const anchor = normalizePeriod(value)
  const [draft, setDraft] = useState(() => clampToDate(anchor?.month, anchor?.year))
  const [viewYear, setViewYear] = useState(() => draft.year)

  const titleId = useId()
  const helpId = useId()

  /* §18: the sheet is a dialog, so opening it must move focus into it and
     closing it must hand focus back to whatever opened it — the trigger lives
     in the card, so this is the only side that can restore it. Nothing traps
     focus: the sheet has no reason to hold it, and a trap it cannot release
     correctly is worse than none. */
  const dialogRef = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.focus?.()
    return () => {
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [])

  const isWindow = variant === 'window'
  const yy = String(((viewYear % 100) + 100) % 100).padStart(2, '0')

  const end = serial(draft.month, draft.year)

  /* PLS-WC-08 — both ends. The ceiling defaults to the selection itself on the
     'window' frame, which is what the design draws (Jun 26 picked, Jul 26..Dec
     26 dead); the floor exists only when a caller passes `min`, because there
     is no sensible guess for where a series starts. */
  const ceiling = resolveBound(max, draft)
  const limit = ceiling ? serial(ceiling.month, ceiling.year) : (isWindow ? end : null)
  const floorBound = resolveBound(min, draft)
  const floor = floorBound ? serial(floorBound.month, floorBound.year) : null

  // Monthly only: the twelve months the chart draws, not just their end (§3.3).
  const windowSet = isWindow ? windowSerials(draft, anchor, windowMonths) : null
  const nav = yearNavState(viewYear, limit, floor)

  /** The four states a chip can be in, and the design's fill for each. */
  const chipStyle = (state) => {
    if (isWindow && state.selected) {
      return { backgroundColor: BLUE, borderColor: BLUE, color: WHITE, fontWeight: 500 }
    }
    if (!isWindow && state.selected) {
      return { backgroundColor: BLUE_50, borderColor: BLUE, color: BLUE, fontWeight: 500 }
    }
    if (state.inWindow) {
      return { backgroundColor: BLUE_50, borderColor: 'transparent', color: BLUE, fontWeight: 500 }
    }
    return { backgroundColor: SLATE_100, borderColor: 'transparent', color: FOREGROUND, fontWeight: 400 }
  }

  const rows = [MONTHS.slice(0, 4), MONTHS.slice(4, 8), MONTHS.slice(8, 12)]

  /* The footer shortcut is part of the 'window' frame. A caller that wants it
     on the simple frame — Daily's `Latest month`, Hourly's `Latest` (§2) —
     opts in by passing the handler that makes it do something. */
  const showFooter = isWindow || typeof onSelectLatest12 === 'function'

  const handleApply = () => {
    onApply?.({ month: draft.month, year: draft.year })
    onClose?.()
  }

  const handleLatest12 = () => {
    onSelectLatest12?.()
    onClose?.()
  }

  return (
    <div className="absolute inset-0 z-40">
      {/* Invisible, so the frame's pixels are untouched — the design draws no
          scrim. It exists only so a tap outside the sheet cancels, which is
          what a bottom sheet is expected to do. */}
      <button
        type="button"
        aria-label="Close month picker"
        onClick={onClose}
        className="absolute inset-0 size-full cursor-default bg-transparent"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={isWindow ? helpId : undefined}
        tabIndex={-1}
        className="absolute bottom-0 left-0 right-0 bg-[var(--popover,white)] border-[length:var(--border-width\/border,1px)] border-[#e5e5e5] border-solid content-stretch flex flex-col gap-[var(--component\/popover\/gap,16px)] items-start justify-end overflow-clip pb-[var(--spacing\/7,28px)] pt-[var(--p-0,0px)] px-[var(--p-0,0px)] rounded-[var(--component\/popover\/radius,18px)] shadow-[0px_-25px_50px_-12px_rgba(0,0,0,0.1)]"
      >
        <div className="content-stretch flex flex-col gap-[var(--spacing\/1,4px)] items-center justify-center p-[var(--p-0,0px)] relative shrink-0 w-full">
          <div className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-start p-[var(--p-0,0px)] relative rounded-[var(--component\/calendar\/radius,26px)] shrink-0 w-full">

            {/* ── Caption: title (+ subtitle) and the year stepper ────────── */}
            <div className="content-stretch flex flex-col gap-[var(--p-0,0px)] items-start pb-[var(--spacing\/1\,5,6px)] pt-[var(--component\/calendar\/padding,12px)] px-[var(--component\/calendar\/day-radius,26px)] relative shrink-0 w-full">

              {/* The simple frame fixes this row at 40px around a 32px
                  trigger; the advanced one hugs, because the subtitle sets the
                  height. Inline because it is the one value that varies. */}
              <div
                className="content-stretch flex gap-[8px] items-center justify-center px-[var(--spacing\/1\,5,6px)] py-[var(--p-0,0px)] relative shrink-0 w-full"
                style={{ height: isWindow ? undefined : 40 }}
              >
                <div
                  className="content-stretch flex flex-col items-center justify-center px-[8px] py-[var(--p-0,0px)] relative shrink-0 text-center"
                  style={{ height: isWindow ? undefined : 32 }}
                >
                  <p
                    id={titleId}
                    className="[word-break:break-word] font-semibold leading-[var(--text\/base\/lh,24px)] relative shrink-0 text-[length:var(--text\/base\/size,16px)]"
                    style={{ color: FOREGROUND }}
                  >
                    Select month
                  </p>
                  {isWindow && (
                    <p
                      id={helpId}
                      className="[word-break:break-word] font-normal leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[length:var(--text\/sm\/size,14px)]"
                      style={{ color: '#737373' }}
                    >
                      Pick the last month of the window. The 12 months ending there are selected.
                    </p>
                  )}
                </div>
              </div>

              <div className="content-stretch flex h-[32px] items-center justify-between py-[var(--p-0,0px)] relative shrink-0 w-full">
                <button
                  type="button"
                  aria-label="Previous year"
                  disabled={nav.prevDisabled}
                  onClick={() => setViewYear((y) => y - 1)}
                  className="bg-[var(--colors\/slate\/200,#e2e8f0)] content-stretch flex gap-[var(--p-0,0px)] items-center justify-center opacity-[calc(var(--opacity-50,50)/100)] p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] shrink-0 size-[32px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-25"
                  style={{ color: SLATE_600 }}
                >
                  <ChevronLeft16 className="size-4" />
                </button>

                <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
                  <div className="content-stretch flex gap-[var(--p-0,0px)] h-[32px] items-center max-w-[224px] overflow-clip pl-[8px] pr-[var(--component\/calendar\/caption-label\/pr,8px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/calendar\/day-radius,26px)] shrink-0">
                    <p
                      className="[word-break:break-word] font-medium leading-[var(--text\/sm\/lh,20px)] overflow-hidden relative shrink-0 text-[14px] text-ellipsis whitespace-nowrap"
                      style={{ color: FOREGROUND }}
                    >
                      {viewYear}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Next year"
                  disabled={nav.nextDisabled}
                  onClick={() => setViewYear((y) => y + 1)}
                  className="bg-[var(--colors\/slate\/200,#e2e8f0)] content-stretch flex gap-[var(--p-0,0px)] items-center justify-center opacity-[calc(var(--opacity-50,50)/100)] p-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] shrink-0 size-[32px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-25"
                  style={{ color: SLATE_600 }}
                >
                  <ChevronRight16 className="size-4" />
                </button>
              </div>
            </div>

            {/* ── Month grid, "Latest 12 months", Cancel / Apply ──────────── */}
            <div className="content-stretch flex flex-col gap-[var(--component\/calendar\/padding,12px)] items-start px-[var(--component\/calendar\/day-radius,26px)] py-[var(--component\/calendar\/padding,12px)] relative shrink-0 w-full">
              <div className="content-stretch flex flex-col gap-[27px] items-start relative shrink-0 w-full">

                {/* Row gap is the one measurement the two frames differ on:
                    16px on the simple sheet, 22px once the subtitle pushes the
                    grid down on the advanced one. */}
                <div
                  className="content-stretch flex flex-col items-start relative shrink-0 w-full"
                  style={{ gap: isWindow ? 22 : 16 }}
                >
                  {rows.map((row, rowIndex) => (
                    <div
                      key={row[0]}
                      className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full"
                    >
                      {row.map((label, columnIndex) => {
                        const month = rowIndex * 4 + columnIndex
                        const state = chipState({ s: serial(month, viewYear), end, window: windowSet, limit, floor })
                        const text = isWindow ? `${label} ${yy}` : label
                        return (
                          <button
                            key={label}
                            type="button"
                            disabled={state.disabled}
                            /* PLS-WC-08: unavailable means unavailable — out of
                               the tab order as well as unclickable. */
                            tabIndex={state.disabled ? -1 : undefined}
                            aria-pressed={state.selected}
                            /* §18, colour is never the only carrier: the eleven
                               months leading up to the selection are tinted, so
                               they also have to say so. */
                            aria-label={state.inWindow ? `${text}, within the selected window` : undefined}
                            data-in-window={state.inWindow ? 'true' : undefined}
                            onClick={() => setDraft({ month, year: viewYear })}
                            className="border-[0.5px] border-solid content-stretch flex flex-[1_0_0] h-[36px] items-center justify-center min-w-px px-[6px] relative rounded-[7px] cursor-pointer disabled:cursor-not-allowed"
                            style={chipStyle(state)}
                          >
                            <span className="[word-break:break-word] leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[length:var(--text\/sm\/size,14px)] text-center whitespace-nowrap">
                              {text}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>

                {showFooter && (
                  <button
                    type="button"
                    onClick={handleLatest12}
                    className="bg-[var(--colors\/slate\/100,#f1f5f9)] content-stretch flex h-[32px] items-center justify-center px-[6px] relative rounded-[7px] shrink-0 w-full cursor-pointer"
                  >
                    <span className="[word-break:break-word] font-normal leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[length:var(--text\/sm\/size,14px)] text-black text-center whitespace-nowrap">
                      {footerLabel}
                    </span>
                  </button>
                )}

                <div className="content-stretch flex gap-[16px] items-start relative shrink-0 w-full">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-[var(--colors\/slate\/200,#e2e8f0)] content-stretch flex flex-[1_0_0] gap-[var(--component\/button\/gap,6px)] h-[36px] items-center justify-center min-w-px px-[var(--component\/button\/size-default\/px,12px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] cursor-pointer"
                  >
                    <span className="[word-break:break-word] font-normal leading-[var(--text\/sm\/lh,20px)] relative shrink-0 text-[length:var(--text\/sm\/size,14px)] text-black text-center whitespace-nowrap">
                      Cancel
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApply}
                    className="bg-[var(--colors\/blue\/50,#eff6ff)] border border-[var(--wint-blue-accent,#0b81f8)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--component\/button\/gap,6px)] h-[36px] items-center justify-center min-w-px px-[var(--component\/button\/size-default\/px,12px)] py-[var(--p-0,0px)] relative rounded-[var(--component\/button\/size-default\/radius,26px)] cursor-pointer"
                  >
                    <span className="[word-break:break-word] font-medium leading-[var(--text\/sm-tight\/lh,20px)] relative shrink-0 text-[length:var(--text\/sm-tight\/size,14px)] whitespace-nowrap" style={{ color: BLUE }}>
                      Apply
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
