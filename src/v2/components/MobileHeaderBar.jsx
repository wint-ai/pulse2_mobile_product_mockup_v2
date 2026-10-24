/**
 * MobileHeaderBar — the one header both v2 screens draw.
 *
 * Figma, re-fetched 2026-10-20 (the frames had been edited and the older
 * payload was two days stale):
 *   199383:141502   System page_mobile, alert   (sysA)
 *   199394:20586    System page_mobile, calm    (sysB)
 *   199360:129729   Location page_mobile        (locA / locB)
 * All four now draw this bar atom for atom, which is why it is ONE component
 * instead of two copies that drift. Every class below is the node's own.
 *
 * THE NODE'S SHAPE — and it is a SINGLE ROW:
 *
 *   Mobile Header Bar  h-[59px] py-[24px] gap-[6px] justify-center
 *   └── content 199383:141503   justify-between, flex-wrap, gap-y-[10px]
 *       ├── left 199383:141504  flex-[1_0_0] min-w-px
 *       │   ├── Back  199383:141505   30px round, #fafbfc on white, chevron-left 24
 *       │   └── Scope 199383:141507   flex-[1_0_0] h-28 pr-7 rounded-23
 *       │        · label 199383:141508   16/24 Figtree Medium slate-800
 *       │        · chevron-down 199383:141509   24px
 *       └── Avatar 199383:141510   28px round, hard right
 *
 * WHAT THE CONTROLS DO. A Figma frame draws affordances and cannot say what
 * they do, so this came from the repo owner, verbatim, looking at this bar:
 *
 *     "Back
 *      Down arrow - opens side bar navigation
 *      Avatar open user profile and 'More'"
 *
 * Three consequences, each of which deletes something the app had:
 *
 * 1. NO BURGER. Both screens used to carry one at the far left as the only way
 *    into WintSidebarV2. The nodes have never drawn it, and it was kept on the
 *    grounds that navigation needs a door. It still does — the door is now the
 *    chevron-down, which is what the owner assigned it. The whole scope slot
 *    is the button, so the target is the full width of the label, not a 24px
 *    glyph; that is well past the 24x24 minimum in WCAG 2.5.8.
 *
 * 2. NO SUPPORT GLYPH. The right-hand slot used to hold CustomerSupport. That
 *    control was `aria-disabled` and documented "deliberately inert — this app
 *    has no support route", so it was a picture of a button, and removing it
 *    costs no behaviour. Said explicitly because Rule 0 forbids dropping
 *    functionality quietly, and this is the one case where there was none.
 *
 * 3. ONE ROW, NOT TWO. The bar used to carry the system name on a second row.
 *    The node is h-[59px] with a single 28px row centred in it; a second row
 *    pushed it to 64px and spilled into the gap below. The name is not lost —
 *    the scope slot carries it on /system/:id (see SystemPageV2Screen), which
 *    is what that slot is for: the scope you are in, and the control that
 *    changes it.
 *
 * THE AVATAR IS THE NODE'S OWN PICTURE, fetched and committed.
 * Figma serves it from a figma.com/api/mcp/asset URL that dies in about a
 * week, and check-shell-contract.mjs bans referencing one of those at runtime
 * — so the file was downloaded while the link was still alive and committed
 * as src/assets/avatar.jpg. (It arrives named .png and is actually a 460x460
 * JPEG; the extension here follows the bytes.) Nothing points at figma.com.
 *
 * The persona's initials stay UNDERNEATH it, on the bg-primary disc
 * AccountScreenV2 draws for the same person at 40px. They are invisible while
 * the image loads correctly and are what remains if it ever fails, so the
 * control still identifies who is signed in rather than going blank.
 * Note the design's avatar is one fixed portrait: it illustrates the slot, it
 * does not vary by persona the way the initials do.
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
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUserContext } from '@/context/UserContext'
import avatarUrl from '@/assets/avatar.jpg'

/* Figtree Medium, spelled as the node spells it. Kept as a constant because
   the escaped `\/` has to survive into the class string: in a PLAIN JS string
   `\/` collapses to `/`, which Tailwind reads as an opacity modifier, and the
   utility then silently never applies. String.raw is what keeps the bytes. */

/** AccountScreenV2's rule, so one person gets one set of initials. */
function initialsOf(name) {
  return (name || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
}

export default function MobileHeaderBar({
  /** The scope you are in. The node centres it and the chevron-down changes it. */
  label,
  /** Back. Omit it and the control is not drawn — a header with nowhere to go
      should not draw an arrow that does nothing. */
  onBack,
  backLabel = 'Back',
  /** The drawer. This is the chevron-down's job now that the burger is gone. */
  onOpenTree,
  className,
  nodeId = '199383:141502',
}) {
  const navigate = useNavigate()
  const { persona } = useUserContext() || {}

  return (
    <div
      className={cn(
        String.raw`content-stretch flex flex-col gap-1.5 h-[59px] items-center justify-center py-6 relative shrink-0 w-full`,
        className,
      )}
      data-node-id={nodeId}
      data-name="Mobile Header Bar"
    >
      <div
        className="content-center flex flex-wrap gap-y-[10px] items-center justify-between relative shrink-0 w-full"
        data-node-id="199383:141503"
        data-name="content"
      >
        {/* 199383:141504 — the flex-1 left group. No column gap: the node sets
            the back control flush against the scope slot. */}
        <div
          className="content-stretch flex flex-[1_0_0] items-center min-w-px relative"
          data-node-id="199383:141504"
        >
          {/* The node draws a 30px disc and ui/button's icon sizes are
              24 / 32 / 36 / 40, so the size is overridden rather than picked.
              Everything the hand-rolled version spelled out — outline-none,
              the 3px focus ring, ring-ring/50 — now comes from the base,
              which is the point: the ring becomes the design system's to
              change, not this file's. `flex` and `hover:bg-card` are last so
              they beat the base's inline-flex and ghost's hover:bg-accent;
              the geometry is otherwise the node's, unchanged. */}
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              aria-label={backLabel}
              className="bg-surface-card border border-solid border-card flex items-center justify-center pr-[2px] relative rounded-[120.833px] size-[30px] cursor-pointer hover:bg-card active:opacity-60"
              data-node-id="199383:141505"
            >
              {/* The node's glyph is a Tabler raster on an expiring asset URL;
                  lucide's chevron-left is the same mark at the node's 24px,
                  and is the substitution EventOverlayV2 already makes. */}
              <ChevronLeft className="size-[24px] text-neutral-950" aria-hidden="true" />
            </Button>
          ) : null}

          {/* 199383:141507 — the scope slot. The WHOLE slot is the drawer
              trigger, not just the caret: the owner pointed at the chevron,
              but a 24px glyph as the only door into navigation is a worse
              target than the label beside it, and the caret is what announces
              that the label is changeable in the first place. */}
          <button
            type="button"
            onClick={onOpenTree}
            aria-label={`Scope: ${label}. Open the navigation drawer.`}
            aria-haspopup="dialog"
            className="content-stretch flex flex-[1_0_0] h-[28px] items-center justify-center min-w-px pr-[7px] relative rounded-[23px] cursor-pointer outline-none transition-colors hover:bg-card/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            data-node-id="199383:141507"
          >
            <p
              className={cn(
                '[word-break:break-word] relative min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
                'font-sans',
                /* `leading-` goes AFTER the size. Figma emits its classes
                   alphabetically, which puts leading- first, and tailwind-merge
                   treats it as conflicting with the font-size atom and deletes
                   it. Same trap, same spelling, both screens. */
                String.raw`font-medium text-slate-800 text-base leading-6`,
              )}
              dir="auto"
              data-node-id="199383:141508"
            >
              {label}
            </p>
            <ChevronDown
              className="size-[24px] shrink-0 text-neutral-950"
              aria-hidden="true"
              data-node-id="199383:141509"
            />
          </button>
        </div>

        {/* 199383:141510 "Avatar" — hard right, pushed out by justify-between
            on the content row. Opens More, on the profile view. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          /* To More itself, NOT to the "Personal information" sub-page behind
             it. Owner: "why do we need two user profiles pages". More already
             opens on the profile summary — name, email, role — so deep-linking
             past it put the user one screen further from everything else that
             lives there, for two fields they had not asked for. */
          onClick={() => navigate('/account')}
          aria-label={persona?.name ? `${persona.name} — profile and More` : 'Profile and More'}
          className={cn(
            'flex items-center justify-center overflow-clip relative size-[28px] cursor-pointer active:opacity-60',
            /* ghost's hover:bg-accent would wash the brand disc, and the node
               draws no hover at all — pinning it back to bg-primary keeps the
               avatar inert, as drawn. */
            String.raw`rounded-full bg-primary text-primary-foreground hover:bg-primary`,
          )}
          data-node-id="199383:141510"
          data-name="Avatar"
        >
          <span className="font-bold text-[11px] leading-none">{initialsOf(persona?.name)}</span>
          {/* The node's <img>, verbatim: absolutely filled, object-cover,
              rounded-full and pointer-events-none so the button keeps the
              click. It sits ON the initials, which is why they are the
              fallback and not a second control. */}
          <img
            alt=""
            src={avatarUrl}
            className={cn(
              'absolute inset-0 max-w-none object-cover pointer-events-none size-full',
              String.raw`rounded-full`,
            )}
          />
        </Button>
      </div>
    </div>
  )
}
