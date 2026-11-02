/**
 * THE VALVE STATE READOUT — one atom, one colour cue, the word always there.
 * Added 2026-11-02 for the valve redesign. The three valve surfaces
 * (`ValveManagementCard`, `ValveManagementScreen`, `BulkValveConfirmSheet`)
 * render state through THIS and nothing else.
 *
 * The owner, 2026-11-02: "the widget for valves looks too messy. Too much
 * information, it's not organized well, it's too big... It needs to be much
 * more clear, much more easy to understand to open, close the valves, to see
 * statuses."
 *
 * ── THE DEFECT THIS REPLACES: A 3x COLOUR COLLISION ───────────────────────
 * Every valve row drew a `--valve-*` SWATCH 6-10px away from a `ValveStatus`
 * GLYPH, and for the same state they were different colours:
 *
 *   state   glyph (ValveStatus.jsx, frozen hex)   swatch (--valve-*, light)
 *   open    #0B82F8  blue                         #5c9e1a  green
 *   closed  #62748E  grey                         #0b81f8  blue
 *   error   #FB2C36  red                          #db4670  pink
 *
 * So a green dot sat beside a blue glyph under the word "Open", and the blue
 * glyph for OPEN was the same blue as the swatch for CLOSED. Two encodings of
 * one fact that disagree are worse than one encoding, because the reader has
 * to decide which to believe.
 *
 * It is worse than cosmetic. `index.css:376-381` EXPLICITLY REJECTED
 * --destructive (#fb2c36) as the valve error colour: against the open green it
 * measures delta-E 2.3 under deuteranopia — "to a deuteranope they are ONE
 * colour, which is the worst available pairing for 'this one is broken' vs
 * 'this one is fine'." The error GLYPH sitting six pixels from that swatch is
 * #FB2C36. The palette's whole accessibility argument was being defeated
 * inside the same badge that made it.
 *
 * THE FIX IS TO DROP THE GLYPH, NOT TO RECOLOUR IT. `ValveStatus.jsx` is
 * deliberately non-themeable — 26 frozen paint attributes, the Figma export
 * verbatim (197639:253443) — and it is still used by the per-system card,
 * which is not in this redesign's scope. Touching it would repaint a surface
 * nobody asked to change. Removing it from THESE rows removes the collision at
 * zero cost to that one, and buys the density the owner asked for as well: a
 * 103-row list loses 103 icons it never needed.
 *
 * ── WHAT CARRIES THE COMPLIANCE NOW ───────────────────────────────────────
 * `index.css:358-367` makes the condition explicit: --valve-error against
 * --valve-open is delta-E 7.6 under deuteranopia, inside the 6-8 floor band,
 * "legal ONLY WITH SECONDARY ENCODING... The status icon and the text label
 * beside each swatch are therefore MANDATORY".
 *
 * THE LABEL IS THE SECONDARY ENCODING, and it is the half that was always
 * doing the work — the icon was never selective (you cannot scan 103 rows by
 * glyph) and, as shown above, it was actively contradicting the swatch. So the
 * rule survives in the stronger form: in this component THE WORD IS NOT
 * OPTIONAL. There is no prop that removes it and no variant without it. WCAG
 * 1.4.1 is satisfied by text, which is the one secondary encoding that works
 * at 6px, in every theme, and in a screen reader.
 *
 * ── THE TWO DIMENSIONS, AND WHY CONNECTIVITY IS NOT A SECOND DOT ──────────
 * A row states two orthogonal things: WHAT the valve is (open/closed/error/
 * none) and HOW SURE WE ARE (live / last known / not applicable —
 * `valveCertaintyOf`). The redesign's standing rule:
 *
 *   VALVE POSITION OWNS HUE AND THE WORD. CONNECTIVITY IS ENCODED BY DIMMING
 *   THE WHOLE ROW, PLUS THE WORD "Offline" AND AN AGE. NOT A SECOND
 *   COLOURED DOT.
 *
 * Bertin's visual variables are the warrant. HUE is *selective* — you can pick
 * out all the greens in one sweep — so it belongs to the primary dimension.
 * LIGHTNESS is *dissociative*: a dimmed row visually leaves the group, which
 * is precisely the meaning "not in the actionable set". SHAPE is never
 * selective, so a second small dot would not let anyone scan 103 rows for the
 * offline ones; it would only add a mark to decode.
 *
 * Corroborated three ways. Carbon files shape indicators as a *secondary* set
 * and warns "avoid the same shape with different colors within the same
 * experience" (which is exactly a second dot), and that past 5-6 indicators a
 * list stops being scannable. Fluent 2 allows exactly ONE overlay on an item
 * and warns that badges on targets <=32px are hard to see — a 6px second dot
 * on a 393px phone is under their own floor. Most directly: Shopify SHIPPED a
 * two-dimension badge (`tone` plus an orthogonal `progress` fill) and then
 * DELETED it — "Progress must be conveyed through the label and tone... Don't
 * rely on a partially filled indicator." "Open but offline" is structurally
 * the same problem as "partially fulfilled", and it gets the same answer: the
 * label carries it.
 *
 * So `certainty` here changes the WORD and nothing else. The row owns the
 * dimming and the "Offline · last seen 26h" line; this atom never emits a
 * second colour, a second dot, or an opacity of its own.
 *
 * ── ONE SWATCH, ONE SIZE ──────────────────────────────────────────────────
 * `Swatch` was defined TWICE — `ValveManagementCard.jsx:441-452` at 10px with
 * an inline `style={{ backgroundColor: var(--valve-*) }}`, and
 * `ValveManagementScreen.jsx:376-395` at 8px with the `bg-valve-*` utilities
 * and a different `none` branch. Two copies of one chip is how a legend and a
 * row end up disagreeing. Folded into `ValveSwatch` below: ONE size (10px, the
 * larger of the two — the smaller one was already under Fluent's visibility
 * floor), ONE `none` treatment, and the TOKEN UTILITIES rather than an inline
 * style, so the chip follows all four themes through `--color-valve-*`
 * (`index.css:866-868`) instead of a style attribute no theme can reach.
 *
 * ── TOKENS ONLY ───────────────────────────────────────────────────────────
 * `bg-valve-open` / `-closed` / `-error` exist only because `index.css:859-868`
 * declares `--color-valve-*` in `@theme`. A Tailwind colour utility naming a
 * token this repo does NOT define falls through to stock Tailwind silently and
 * freezes across all four themes, so nothing below invents a colour name.
 * The WORD is deliberately NOT painted in the valve hue: --valve-open is
 * #5c9e1a, which is 3.3:1 on the card and fails 4.5:1 as small text. Ink stays
 * inherited; hue stays in the chip, which is a graphical object and only owes
 * 3:1.
 */

import { cn } from '@/lib/utils'
import { VALVE_CATEGORIES, valveReadingOf } from './valveScope.js'

/* The word per category — ONE map, in the one file every valve surface now
   imports. `ValveManagementCard.jsx:434` and `ValveManagementScreen.jsx`
   each built their own from this same constant; that is the duplication this
   atom is here to end. Derived, never retyped: the labels are the design's
   vocabulary and `VALVE_CATEGORIES` owns them. */
const LABEL_OF = Object.fromEntries(VALVE_CATEGORIES.map((c) => [c.key, c.label]))

/* Fill per category, as TOKEN UTILITIES. THREE KEYS, NOT FOUR: `none` is the
   deliberate hole — it draws hollow, and the fallback below is what makes that
   the answer for an unknown key too. See the `ValveSwatch` note. */
const SWATCH_CLASS = {
  error: 'bg-valve-error',
  open: 'bg-valve-open',
  closed: 'bg-valve-closed',
}

/* What a chip with no fill looks like. Also the fallback for a key this file
   does not know: hollow is the only mark that cannot be mistaken for one of
   the three real states. */
const HOLLOW = 'border border-solid border-border bg-transparent'

/* The word the chip is standing next to, by certainty.

   NEW COPY: "Last known: ". The valve word after it is `VALVE_CATEGORIES`'
   own, verbatim — Figma 199535:96542 draws the vocabulary (`Valve Error`,
   `No valve installed`) and this component does not get to re-spell it.

   'not-applicable' takes the bare label: "No valve installed" is already a
   statement about certainty and "Last known: No valve installed" would be
   nonsense — we are not reporting a stale reading, we are reporting absent
   hardware. That is why `valveCertaintyOf` answers 'not-applicable' BEFORE
   'last-known' for an offline system with no valve. */
function wordFor(label, certainty) {
  return certainty === 'last-known' ? `Last known: ${label}` : label
}

/**
 * THE COLOUR CHIP, ALONE. `aria-hidden` because it says nothing the word
 * beside it does not already say, and a screen reader that announced both
 * would read the state twice.
 *
 * EXPORTED, but with a condition: it is for places where the word is ALREADY
 * on screen next to it in the caller's own markup — the chart legend, a
 * filter-sheet option row. It must never ship as the only mark for a state.
 * If you are reaching for it to save a few pixels in a row, use
 * `<ValveStateReadout>` instead; that is the whole reason this file exists.
 *
 * `none` IS AN OUTLINE, NOT A FILL — carried over from the screen's copy,
 * which had the better argument and a browser pass behind it: "It is the
 * absence of hardware, not a state, so it must not read as a fourth colour in
 * the same system as the three real ones... under `contrast` every neutral
 * token is saturated, so a filled `bg-border` chip came out orange and sat
 * beside the pink and the green looking like a state of its own. Hollow reads
 * as 'nothing here' in all four themes."
 */
function ValveSwatch({ categoryKey, className }) {
  return (
    <span
      aria-hidden="true"
      data-slot="valve-swatch"
      data-state={categoryKey}
      className={cn('size-[10px] shrink-0 rounded-full', SWATCH_CLASS[categoryKey] ?? HOLLOW, className)}
    />
  )
}

/**
 * THE ATOM. Chip + word, inline, no border, no background, no opacity — so it
 * drops into an `<ItemTitle>`, an `<ItemActions>`, a `<Badge>` or a bare row
 * without bringing a chassis of its own along.
 *
 * ── API (the three valve surfaces build against this) ─────────────────────
 *   system       a system object. When present, `categoryKey` and `certainty`
 *                are derived from it via `valveReadingOf()` — ONE call, the
 *                same answer the counts and the confirm sheet get. This is the
 *                form a row should use.
 *   categoryKey  'error' | 'open' | 'closed' | 'none'. Required when there is
 *                no `system` (a legend, a filter option, a skip-bucket
 *                heading). Overrides the system's own when both are given.
 *   certainty    'live' | 'last-known' | 'not-applicable'. Defaults to 'live'
 *                when there is no `system`. Overrides the system's own when
 *                both are given — `BulkValveConfirmSheet` needs this to list a
 *                system under "will not be commanded" at its last-known state.
 *   className    merged onto the wrapper. Tune TYPE and SPACING here. Do not
 *                use it to paint: the hue is the chip's and the ink is
 *                inherited, both on purpose (see the TOKENS note above).
 *   ...rest      spread onto the wrapper `<span>`.
 *
 * Returns a single `<span data-slot="valve-state">` carrying
 * `data-state={categoryKey}` and `data-certainty={certainty}`, so a test or a
 * parent can select a row's state without parsing its text.
 *
 * THERE IS NO `showLabel` PROP AND THERE WILL NOT BE ONE. See the compliance
 * note at the top: the word is what makes the palette legal.
 *
 * An unknown `categoryKey` falls back to 'none' rather than throwing — this
 * renders inside a 103-row list and a bad key must not take the screen down —
 * but it draws the hollow chip and the "No valve installed" word, which is
 * visible and wrong rather than invisible and wrong.
 */
function ValveStateReadout({ system, categoryKey, certainty, className, ...rest }) {
  const derived = system ? valveReadingOf(system) : null
  const key = categoryKey ?? derived?.categoryKey ?? 'none'
  const safeKey = key in LABEL_OF ? key : 'none'
  const sure = certainty ?? derived?.certainty ?? 'live'

  return (
    <span
      data-slot="valve-state"
      data-state={safeKey}
      data-certainty={sure}
      className={cn('inline-flex min-w-0 items-center gap-[6px] text-sm leading-snug', className)}
      {...rest}
    >
      <ValveSwatch categoryKey={safeKey} />
      <span className="truncate">{wordFor(LABEL_OF[safeKey], sure)}</span>
    </span>
  )
}

export { ValveStateReadout, ValveSwatch }
