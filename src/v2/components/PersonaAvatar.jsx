import avatarUrl from '@/assets/avatar.jpg'

import { cn } from '@/lib/utils'
import { useUserContext } from '@/context/UserContext'

/**
 * The signed-in person's face: the committed portrait, drawn ON TOP of their
 * initials on a --primary disc.
 *
 * WHY THIS FILE EXISTS. It did not, and the same fifteen lines were inlined
 * three times over — MobileHeaderBar at 28px, AlertsHeaderBar at 38px, and
 * (2026-11-04) the Profile tab at 21px — each with its own private copy of
 * `initialsOf`. The third copy is what made it worth extracting rather than
 * written a fourth time.
 *
 * THE IMAGE IS COMMITTED, NOT FETCHED. Figma serves the node's portrait from a
 * figma.com/api/mcp/asset URL that dies in about a week and
 * check-shell-contract.mjs bans referencing one at runtime, so the file was
 * downloaded while the link was alive and committed as src/assets/avatar.jpg.
 * (It arrives named .png and is actually a 460x460 JPEG; the extension follows
 * the bytes.) Nothing here points at figma.com.
 *
 * THE INITIALS ARE THE FALLBACK, NOT A SECOND CONTROL. They sit UNDER the
 * image on the bg-primary disc AccountScreenV2 draws for the same person, so
 * they are invisible while the portrait loads and are what remains if it ever
 * fails — the control still says who is signed in rather than going blank.
 * The design's portrait is one fixed picture: it illustrates the slot, it does
 * not vary by persona the way the initials do. `pointer-events-none` on the
 * image keeps the click on whatever wraps this.
 *
 * ARIA-HIDDEN, DELIBERATELY. This disc is a picture of the user, never the
 * accessible name. Every call site wraps it in a control that already names
 * itself — the headers with an aria-label, the Profile tab with its visible
 * label — and without this the tab's name would compute as "Profile RK".
 *
 * SIZE IS AN INLINE STYLE, not a `size-[Npx]` utility, because the value comes
 * from a prop. Tailwind's scanner only sees literal class strings, so a
 * template-built `size-[${n}px]` would emit no CSS at all and the disc would
 * collapse — the exact silent failure the token rules in index.css warn about.
 */
function initialsOf(name) {
  return (name || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
}

export default function PersonaAvatar({ size, initialsClassName, className }) {
  const { persona } = useUserContext() || {}
  return (
    <span
      aria-hidden="true"
      data-name="persona-avatar"
      style={{ width: size, height: size }}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-clip rounded-full bg-primary text-primary-foreground',
        className,
      )}
    >
      <span className={cn('font-bold leading-none', initialsClassName)}>{initialsOf(persona?.name)}</span>
      <img
        alt=""
        src={avatarUrl}
        className="pointer-events-none absolute inset-0 size-full max-w-none rounded-full object-cover"
      />
    </span>
  )
}
