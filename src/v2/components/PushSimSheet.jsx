/**
 * The push simulator's on-phone sheet.
 *
 * NOT a Radix <Sheet>, and that is load-bearing rather than taste: shadcn's
 * Sheet portals to document.body and escapes Phone.jsx's 393x852
 * overflow-hidden frame — the failure written up at
 * src/v2/components/ValveConfirmSheet.jsx:17-25 and restated in three other
 * files. The house idiom is `position: absolute; inset: 0` INSIDE the page,
 * which is what IgnoreBottomSheet, MonthPickerSheet, SystemsFilterSheet and
 * ValveConfirmSheet all do, and what this does.
 *
 * DELIBERATELY THIN. The ask was "not too much interface ... a simulator that
 * only someone who knows it can use", so this is a tap-to-fire list and not a
 * form. The desktop panel at /push keeps the variant pickers (WA_01…WA_09)
 * and the param editors; here every card fires its first variant with the
 * catalog's `default` param values. One tap fires and closes, so the
 * notification lands on a clean screen rather than on top of this.
 *
 * The one control above the list is the delivery-surface row, and it earns its
 * place: without it the lock screen — half of what the owner asked to see — is
 * unreachable from the phone, because the gesture is inert once the phone is
 * locked and there is no way back in here to fire anything.
 *
 * EVERY STRING ON SCREEN IS DATA. Section headings and row labels are
 * `PUSH_SECTIONS` / `PUSH_CATALOG` fields; the system line is `sys.name`; the
 * two presenter rows carry the labels the brief specified. Nothing here
 * invents copy, and the notification text itself comes from
 * src/utils/pushText.js, whose every string is byte-for-byte from
 * docs/Notification IDs -V11.0.xlsx.
 *
 * TOKENS ONLY. The one colour that is not a token is each row's dot, which is
 * the catalog entry's own `tint` — data carried in from src/data/pushCatalog.js,
 * not a literal typed here. Everything else is token-backed so the sheet moves
 * under light / dark / sand / contrast.
 *
 * z-260: above the in-app banner (250), below the lock screen / shade /
 * other-app surfaces (300), which are exactly the states in which the gesture
 * that opens this is disabled anyway.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PUSH_SECTIONS } from '@/data/pushCatalog'
import { isCardEligible, DELIVERY_SURFACES } from '@/lib/pushSimFire'

/** Swipe-down distance that counts as a dismissal, as the in-app banner uses. */
const SWIPE_CLOSE_PX = 40

function Row({ label, dotClassName, dotColor, disabled, onClick }) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-[12px] px-[16px] py-[12px] text-left outline-none',
          'hover:bg-slate-100 focus-visible:ring-[3px] focus-visible:ring-ring/50',
          disabled && 'pointer-events-none opacity-40',
        )}
      >
        <span
          aria-hidden="true"
          className={cn('size-[10px] shrink-0 rounded-full', dotClassName)}
          style={dotColor ? { background: dotColor } : undefined}
        />
        <span className="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-foreground">
          {label}
        </span>
      </button>
    </li>
  )
}

export default function PushSimSheet({ open, system, onClose, onFireCard, onLockPhone, onResetDemo }) {
  const [dragFrom, setDragFrom] = useState(null)
  /* Which surface the next tap delivers to. Lives here, so it dies with the
     sheet: closing and re-opening starts at In-app again. Nothing persists. */
  const [surface, setSurface] = useState(DELIVERY_SURFACES[0].id)

  if (!open) return null

  /* Precomputed so the label element renders a bare expression — the
     truncation pair below is what scripts/check-text-overflow.mjs is after,
     and a real system name is long enough to need it. */
  const systemName = system ? system.name : ''

  const beginDrag = (e) => { setDragFrom(e.touches?.[0]?.clientY ?? null) }
  const endDrag = (e) => {
    const y = e.changedTouches?.[0]?.clientY
    if (dragFrom !== null && typeof y === 'number' && y - dragFrom > SWIPE_CLOSE_PX) onClose()
    setDragFrom(null)
  }

  return (
    <div
      className="absolute inset-0 z-[260] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Push simulator"
    >
      {/* Scrim. A tap outside closes without firing anything. */}
      <button
        type="button"
        aria-label="Close push simulator"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-scrim"
      />

      <div className="relative flex max-h-[78%] flex-col overflow-hidden rounded-t-[18px] border-t border-solid border-border bg-surface-card">
        {/* Grab area — swipe down here closes, the way the other sheets do.
            Scoped to the header so it never competes with the list's scroll. */}
        <div
          className="shrink-0 touch-none"
          onTouchStart={beginDrag}
          onTouchEnd={endDrag}
          onTouchCancel={() => setDragFrom(null)}
        >
          <div className="mx-auto mt-[12px] mb-[10px] h-[4px] w-[36px] rounded-[2px] bg-border-subtle" />
          <div className="flex items-center px-[16px] pb-[10px]">
            <span className="min-w-0 flex-1 truncate text-[12px] leading-[16px] text-muted-foreground">
              {systemName}
            </span>
          </div>
        </div>

        {/* Where the next tap delivers. One tap picks the surface, the next
            picks the notification — two taps either way, so it costs nothing
            in interface and it is what makes the lock screen reachable from
            the phone at all. */}
        <div
          role="radiogroup"
          aria-label="Deliver to"
          className="flex shrink-0 gap-[6px] border-y border-solid border-border px-[16px] py-[10px]"
        >
          {DELIVERY_SURFACES.map((s) => {
            const picked = s.id === surface
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={picked}
                onClick={() => setSurface(s.id)}
                className={cn(
                  'rounded-full border border-solid px-[10px] py-[4px] text-[12px] leading-[16px] outline-none',
                  'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  picked
                    ? 'border-primary bg-primary font-semibold text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ul className="flex flex-col border-b border-solid border-border py-[4px]">
            <Row label="Lock phone" dotClassName="bg-muted-foreground" onClick={onLockPhone} />
            <Row label="Reset demo" dotClassName="bg-muted-foreground" onClick={onResetDemo} />
          </ul>

          {PUSH_SECTIONS.map((section) => (
            <div key={section.name}>
              <div className="flex items-center bg-slate-100 px-[16px] py-[6px]">
                <span className="min-w-0 flex-1 truncate font-semibold text-[11px] uppercase leading-[15px] tracking-[0.5px] text-muted-foreground">
                  {section.name}
                </span>
              </div>
              <ul className="flex flex-col py-[4px]">
                {section.cards.map((card) => (
                  <Row
                    key={card.id}
                    label={card.label}
                    dotColor={card.tint}
                    disabled={!isCardEligible(card, system)}
                    onClick={() => onFireCard(card, surface)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
