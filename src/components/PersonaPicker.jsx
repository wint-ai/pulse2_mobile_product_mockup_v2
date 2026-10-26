/**
 * The demo profile cards — one component, both pickers.
 *
 * There are two persona pickers in this app and there always have been:
 *   • the sign-in screen, inline in App.jsx's LoginGate (shown cold, before
 *     the route table mounts), and
 *   • screens/PersonaSelect.jsx at /select, which is LIVE — the sidebar's
 *     profile row (WintSidebarV2.jsx) and Account → Switch profile
 *     (AccountScreenV2.jsx) both navigate there, and routeSmoke covers it.
 * They were near-duplicates with divergent copy and divergent markup. The
 * card is now shared so the next change cannot land on one and miss the
 * other; the two shells stay separate because they really are different
 * screens (one has the pairing chrome, the other does not).
 *
 * TOKENS ONLY. No raw hex and no inline style objects: this screen renders
 * before the app gate, and the previous version wrapped itself in a literal
 * `background:'#fff'` with `#F5F3FF` / `#7C3AED` chips, so it was the one
 * surface in the app that could not follow a theme. The chassis here is the
 * house card — `bg-surface-card border-card rounded-[18px]` — the same three
 * tokens AlertCard, ValveStatusCard and the rest use. Check it with
 * `?theme=contrast`: every colour below has to move.
 *
 * NO FIGMA SOURCE. The delivery canvas (YEmjkKS4xaA827Zm8w3oXx) has no
 * sign-in or persona frame — verified against the page listing and the
 * "💧 Wint" / "Wint delivery" page metadata. The only "Login" nodes in the
 * file are the stock shadcn/ui block kit, which is not this screen. So this
 * follows the established v2 card pattern rather than inventing one.
 *
 * NAMES ARE NOT ON THE CARD, AND NOT GONE. `persona.name` is still read by
 * MobileHeaderBar (avatar initials), WintSidebarV2, AccountScreenV2's profile
 * fields, TenantPropertiesList's greeting, PushNotifications and
 * utils/pushText. Removing the field would break all six. Only the card line
 * is gone — the role is the primary line now.
 */

import { Briefcase, Building2, ChevronRight, House } from 'lucide-react'
import { LISTED_PERSONAS } from '../data/personas'
import { cn } from '@/lib/utils'

/**
 * A glyph per persona, keyed by id rather than by role so a relabel cannot
 * silently drop one. Every persona has an entry, listed or not, because
 * unlisting is a picker decision and this map should survive it.
 */
const PERSONA_GLYPH = {
  'tenant-1apt': House,
  'tenant-2apts': House,
  'building-manager-residential': Building2,
  'location-manager': Building2,
  'portfolio-manager-office': Briefcase,
  'account-manager-subaccount': Briefcase,
  'wint-admin': Briefcase,
}

/**
 * One profile card.
 *
 * Primary line: the ROLE. Secondary line: the SCOPE (`persona.sub`). The
 * secondary line is kept deliberately — with the names gone, "Account
 * Manager" alone says nothing about what you are about to be shown, and
 * picking a profile in this demo IS picking a scope. "Southbridge Health",
 * "100 Meridian Plaza" and "Apartment 3 · Building A" are the only remaining
 * cue.
 */
export function PersonaPickerCard({ persona, onSelect }) {
  const Glyph = PERSONA_GLYPH[persona.id] || Building2
  return (
    <button
      type="button"
      onClick={() => onSelect(persona)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[18px] border border-solid border-card bg-surface-card px-4 py-[14px] text-start shadow-[0px_2px_4px_-2px_rgba(0,0,0,0.1)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Glyph className="size-[20px]" aria-hidden="true" />
      </span>
      {/* <bdi>, not <span>. `role` and `sub` are Latin strings and are NOT
          translated — nothing in this app translates a persona's role or
          scope (AccountScreenV2 and WintSidebarV2 print them raw too), so
          under `he` they sit inside an RTL paragraph. Plain text there is
          reordered by the Unicode bidi algorithm and "100 Meridian Plaza"
          renders as "Meridian Plaza 100" — a leading number is bidi-neutral
          and gets pushed to the trailing edge. <bdi> isolates each line so it
          lays out LTR internally while still sitting on the RTL side of the
          card; dir="auto" alone would also left-align it, which is wrong
          beside a right-hand icon. Verified in chromium under he. */}
      <bdi className="block min-w-0 flex-1 rtl:text-end">
        <span className="block truncate font-bold tracking-[-0.2px] text-slate-900 text-[15px] leading-[20px]">
          {persona.role}
        </span>
        <span className="mt-[2px] block truncate text-slate-500 text-[13px] leading-[17px]">
          {persona.sub}
        </span>
      </bdi>
      <ChevronRight className="size-[18px] shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
    </button>
  )
}

/** The three cards, in the order personas.js declares. */
export function PersonaPickerList({ onSelect, className }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {LISTED_PERSONAS.map(p => (
        <PersonaPickerCard key={p.id} persona={p} onSelect={onSelect} />
      ))}
    </div>
  )
}
