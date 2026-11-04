/**
 * SystemsOverviewHero — the blue wave at the top of the Location screen, with
 * the fleet count on it and the system-type chips under that.
 *
 * ── RE-READ LIVE, 199954:96289 — 2026-11-04, LATER THE SAME DAY ──────
 * The owner's Dashboard restructure link. Fetched live rather than from the
 * cache, because the cache's staleness note only fires past 24h and this
 * family is being edited RIGHT NOW: 199954:96290, the wave inside this block,
 * reported three different boxes in twenty minutes (-29/-115/417x266, then
 * -47/-210/673x409, then -74/-173/605x367, then -43/-173/538x294). Treat every
 * number below as the 2026-11-04 evening reading, not as settled.
 *
 * SIX THINGS MOVE, and two of them REVERSE the 2026-11-04 morning read below:
 *   1. THE BOX IS 130, not 150. "Main header" is 162 tall and its last 36 are
 *      the TAB ROW, which the page draws as a sibling under this box. PillTabs
 *      is 32 by its own owner ruling rather than the node's 36, so 130 + 32 is
 *      the node's 162 block and nothing is short.
 *      The chip chassis went 32 -> 34.56 with it: the whole group is scaled
 *      1.08 in this frame (150->162, 32->34.56, 75->81, 25.4->27.43 all land
 *      on x1.08 exactly), so the chips are genuinely taller than the pill the
 *      October read measured, and drawing them at 32 is most of what the owner
 *      saw as "the layout here is not as in Figma".
 *   2. THE HEADLINE IS LEFT-ALIGNED AGAIN, at the chip row's inset. Reverses
 *      item 2 of the morning read.
 *   3. THE CHIPS ARE BUNCHED AGAIN, left at x=23 on a 5px gap. Reverses item 3.
 *   4. THE INSET IS 23px, not 21.
 *   5. A NEW EYEBROW — 199955:96839, "12 Locations" — above the headline. It
 *      is DATA; see the `locations` prop.
 *   6. THE HEALTH CARD LEFT THIS BLOCK. It is no longer pinned under the hero
 *      at all: the frame puts the tab row here and the health card BELOW the
 *      tabs, so the -37px overlap the caller used to apply is gone.
 * The wave, the tint, the blend variant, the chip chassis and the numeral type
 * are unchanged and are NOT re-derived.
 *
 * ── THE ACCOUNT DASHBOARD HEADER, 199922:85244 — 2026-11-04 ──────────
 * The owner's new frame for this surface. Four things move, and the fourth
 * is a removal the owner asked for in words as well:
 *   1. THE BOX IS 370x150, not 370x189. Same rounded-[17px], same wave, same
 *      #a0ccff tint at mix-blend-multiply over an opacity-90 raster.
 *   2. THE HEADLINE IS CENTRED. It was left-anchored at the chip row's own
 *      21px inset; it is centred across the box now, same 34.646/39.37 type
 *      and the same --ink-on-color.
 *   3. THE CHIPS ARE EVENLY SPREAD rather than bunched at the left on a 5px
 *      gap: the row spans gutter to gutter and justifies between.
 *   4. THE "Active" PILL IS GONE. See THE LIFECYCLE PILL below — the frame
 *      carries two `Active`+chevron frames and both are hidden="true", and
 *      the owner asked for it independently of the frame.
 * The chip chassis, the numeral type, the wave crop and the tint are all
 * unchanged from the 2026-11-01 read and are NOT re-derived below.
 *
 * THE CHIPS ARE SYSTEM TYPES, and at 0 they carry an upsell rather than a
 * dead end — see THE ZERO CHIP.
 *
 * ── REFETCHED 2026-11-01 ─────────────────────────────────────────────
 * Owner: "I feel like we are not working with the latest version of the hero."
 * He was right, and the reason is structural: the design has been
 * COMPONENTISED since the October read. The hero is now "Main header"
 * (199531:81213) inside an "Account Main header" component (199531:81214)
 * that also carries the health card, and the owner's link 199532:87418 is an
 * INSTANCE of that component. Read through the instance, so the variables
 * resolve in its own mode rather than the file default. Fresh ids:
 *   199531:81213  Main header (this component)
 *   199466:17470  the wave group        199466:17471  the headline
 *   199531:80031  the chip row          199531:80032/:80035/:80038  the chips
 *   199531:80083  the "Active" pill — NEW, see its own block below
 * Five things moved: the wave crop, a blue tint layer that did not exist
 * before, the chip radius and border, the chip numeral's type, and the
 * headline/chip positions. NOTHING was removed from the frame, so nothing is
 * removed here — Rule 0 never had to fire.
 *
 * The October read below is kept because its REASONING still holds (the
 * overlap, the single asset, the token pass). Only the ids and the numbers it
 * quotes are superseded by the list above.
 *
 * Figma, fetched 2026-10-20 from the four "Accont / location" variants the
 * owner sent as the latest:
 *   199417:131529  all clear
 *   199414:130087  three fault kinds
 *   199417:132861  one fault kind, the other two drawn at zero
 *   199417:134216  one fault kind, drawn alone
 * All four carry the same hero; only the card below it changes. The group is
 * 199414:130115, the wave 199414:130117, the headline 199414:130118 and the
 * chips 199417:131528.
 *
 * WHY THIS EXISTS AT ALL. The fleet count used to live INSIDE the health card,
 * as a slate-100 row reading "103 systems" (199359:128709). These frames take
 * it out of the card and put it on a wave above, with three type chips beside
 * it. SystemHealthCard drops that row in the same change, so the count is
 * moved rather than duplicated — and it is not lost, which is the thing Rule 0
 * cares about.
 *
 * THE CARD OVERLAPS THE WAVE. The node has the wave at h-[189px] and pins the
 * card at top-[152px], i.e. 37px of overlap, inside a fixed h-[398px] group.
 * Reproduced here as flow, not absolutes: the wave is a block and the caller
 * pulls the card up by 37px. A fixed-height group would clip our card, whose
 * height is real data and varies with how many fault kinds are showing.
 *
 * ONE ASSET, NO TINT. The wave is the same raster the System page hero draws
 * (system-hero-wave.png, Figma's 9c2cf.png in both exports). There it sits
 * under a #ff7b7d mix-blend-color layer and reads red; here the node has no
 * tint layer at all, so the raster's own blue comes through. That is the whole
 * difference between the two heroes.
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
import { useEffect, useId, useRef, useState } from 'react'
/* The external-link mark on the zero chip's sales CTA. Lucide's own glyph, per
   src/v2/icons/index.js ("Lucide still covers everything it already has"). */
import { ArrowUpRight } from 'lucide-react'

import { BrandDrops, FloodLine, PhotoSensor3 } from '@/v2/icons'
import { SYSTEM_TYPE, SYSTEM_TYPE_BLURB } from '@/data/systemType'
import { cn } from '@/lib/utils'
/* The wave layer moved OUT of this file on 2026-11-04 and nothing about it
   changed on the way — see HeroWaveArt's header. It left because the Dashboard
   restructure gave it a second caller that paints the same raster full-bleed,
   and two copies of one artwork is the drift PillTabs exists to record. The
   REASONING for the blend variant, the `isolate` and the raw #a0ccff is still
   below, where it was written against the node. */
import HeroWaveArt from '@/v2/components/HeroWaveArt'


/* 199531:80032 / :80035 / :80038 — all three identical but for width, which
   the node sizes to its own numeral. Here they size to content, so a four-digit
   count does not clip. */
/* The plate is a translucent veil of the hero's own ink, not a surface in
   its own right: what the numerals actually read against is the blue the
   veil lifts. `light` keeps the literal byte for byte (pixel parity);
   every other theme computes the same 28% veil from --ink-on-color, so
   the value is no longer frozen. Under `contrast` --ink-on-color is dark,
   so the veil goes dark there too and the pair stays coherent.

   THE REFETCH ADDS A HAIRLINE and tightens the radius (18px -> 12px). The
   node spells the stroke `var(--colors/white, white)`, but a literal `white`
   would freeze across all four themes the way `text-background` once did
   below — under `contrast` the ink inverts to a dark blue and a white hairline
   would be the one thing left on the hero still shouting the light theme. So
   the border is the SAME token the veil already computes from. In `light`
   --ink-on-color is #fafbfc, i.e. the node's white to within (5,4,3) in sRGB
   and invisible at 1px; everywhere else it moves with the ink it belongs to.
   box-sizing is border-box repo-wide, so the hairline sits inside the 32px
   and the chip does not grow. */
const CHIP = String.raw`content-stretch flex gap-[8px] h-[34.56px] items-center justify-between px-[9px] relative rounded-[12px] border border-solid border-ink-on-color bg-[rgba(241,245,249,0.28)] [[data-theme]:not([data-theme=light])_&]:bg-[color-mix(in_oklab,var(--ink-on-color)_28%,transparent)]`
/* The chip numeral — and, since the refetch, the word in the "Active" pill,
   which the node gives the identical type atom.

   THE TYPE MOVED. 15.933px/22.762 Medium became the design system's
   `lg/heading/leading-none/semibold`: 18px, 18px leading, -0.45px tracking,
   font/family/heading. That family is Geist, which this repo owns as
   --font-mono-label (src/index.css); the old literal
   `'Geist:Medium','Geist',...` led with an unmatchable Figma STYLE name and
   resolved to plain 'Geist' anyway, so the utility is the same pixels and one
   fewer private spelling. Size is written BEFORE leading on purpose — the
   repo's standing tailwind-merge trap.

   THE INK. `text-background` WAS THE WRONG TOKEN AND ALWAYS WAS: this is ink
   on a coloured ground, which is precisely what --ink-on-color exists for.
   --background merely happened to be #F4F6F9 in `light` and so resolved to
   the right pixels by coincidence, while on `dark` it resolved to the
   near-black app ground and the numerals vanished into the veil behind them
   (2.3:1, measured). The old note here called reconciling `light` onto
   --ink-on-color "a one-line follow-up for a change that is allowed to move
   light pixels" — this is that change, and the node settles it: the numeral
   is now spelled `var(--colors/white, white)`, which --ink-on-color (#fafbfc)
   is nearer to than --background (#F4F6F9) ever was. So the variant pair is
   gone and one token paints all four themes. */
const CHIP_NUM = String.raw`[word-break:break-word] font-mono-label font-semibold relative shrink-0 text-[18px] leading-[18px] tracking-[-0.45px] text-ink-on-color whitespace-nowrap`

const fmt = (n) => Number(n ?? 0).toLocaleString('en-US')

/* ── THE ZERO CHIP IS A SALES SURFACE — 2026-11-04 ───────────────────────
   Owner, rejecting the first draft of this panel outright: "This is a bad
   sentence. I want something more on the sales aspect, like contact Wint sales
   or contact your account manager. For more details or something like that.
   The main goal here is to do upsells for systems that not sold yet."

   WHAT CHANGED, AND WHY THE FIRST DRAFT WAS WRONG. It read "No {type} on this
   account yet. Your Wint contact can add them." - an explanation of an
   ABSENCE, and the "yet" made it an apology for one. A 0 here is not a gap in
   the account, it is a product the account has not bought, and the panel's job
   is to name the thing and offer the conversation.

   THE PANEL IS THREE BLOCKS, AND THAT IS THE OWNER'S COUNT. 2026-11-04, on a
   screenshot of the Flood sensors panel: "Same issue with the second sentence,
   across the system topologies, I don't want the second sentence. I only want
   the first one, and the talk to Wint sales, that's it."

     <type name>               the title the panel already drew
     <description>             SYSTEM_TYPE_BLURB - ONE sentence now; the
                               catalogue was trimmed at the boundary, see
                               src/data/systemType.js for the deleted halves
                               and for the one that is worth his eye
     [Talk to Wint sales ->]   the external link, to wint.ai/contact/

   A FOURTH BLOCK STOOD BETWEEN THE LAST TWO AND IS GONE. A per-type "benefit"
   line ("They catch water where there is no pipe to meter.", and one each for
   humidity and flow) was drafted and wired for about an hour; the owner cut
   all three. Nothing replaces them - the count is three blocks, not three
   blocks and a substitute - and the UPSELL_BENEFIT map went with them rather
   than being left unreferenced. Recorded here because the drafts were marked
   NEW COPY and someone will otherwise wonder where they went.

   REGISTER: §3b, everyday, not the danger register - nothing on this panel
   stops or starts water. Sentence case, active voice, and the control is named
   for its outcome rather than "Learn more". */
const SALES_URL = 'https://wint.ai/contact/'
/* NEW COPY - awaiting owner approval. Named for the outcome (§3b rule 5), not
   "Learn more" and not "Contact us". */
const UPSELL_CTA = 'Talk to Wint sales'

/* The chips carry NO text label in the node — an icon and a number, nothing
   else — so the icon is the whole of their meaning. These three glyphs are
   already named in this codebase: SystemsHealthCard draws the same set under
   the heading "Systems types" as Topology / Flood / Humidity, so that is what
   they are, and the accessible name says so even though the pixels cannot. */
/* The glyph is an ELEMENT, not a component reference. eslint here has no react
   plugin, so it does not read JSX: a capitalised binding used only as <Glyph/>
   reads as unused and the build still succeeds, which is how an unimported
   component once shipped and crashed at runtime. Elements keep each icon a
   plain, visible reference. */
const TYPES = [
  { key: 'topology', name: 'Flow Monitoring systems', type: SYSTEM_TYPE.FLOW, size: 19.168, glyph: <PhotoSensor3 size="100%" className="absolute inset-0 block" /> },
  { key: 'humidity', name: 'Humidity sensors', type: SYSTEM_TYPE.HUMIDITY, size: 18.21, glyph: <BrandDrops size="100%" className="absolute inset-0 block" /> },
  { key: 'flood', name: 'Flood sensors', type: SYSTEM_TYPE.FLOOD, size: 18.21, glyph: <FloodLine size="100%" className="absolute inset-0 block" /> },
]

export default function SystemsOverviewHero({
  total = 0,
  unitLabel = 'systems',
  /** 199955:96839, the eyebrow above the headline — the number of LOCATIONS in
      the scope this hero is reporting on. null/undefined draws no eyebrow,
      which is what every caller got before 2026-11-04. It is data: the frame's
      `12` is an example value and must not be hard-coded. */
  locations = null,
  /** The eyebrow's noun, transcribed from 199955:96839 including its capital.
      See the COPY warning at the eyebrow for the conflict with
      `home.counts_locations_other`. */
  locationsUnitLabel = 'Locations',
  /** { topology, humidity, flood } — the counts the page already derives. */
  systemTypes,
  /** Called with a SYSTEM_TYPE when a chip is tapped. Omit and the chips stay
      inert, which is what the frame draws. */
  onSelectType,
  /** False ONLY when the caller paints HeroWaveArt behind this box itself.
      See the note at the layer below before passing it. */
  artwork = true,
  className,
}) {
  const counts = systemTypes ?? {}
  const unit = Number(total) === 1 ? unitLabel.replace(/s$/, '') : unitLabel

  /* ── TWO-STAGE TAP, 2026-10-22 ───────────────────────────────────────────
     Owner: "one click here showing wht this type is / two clicks redirect you
     as now". Until now a chip's only gesture was the navigation 7bf0f4f added,
     so the cheaper question — what IS a Topology system? — had no gesture at
     all, and these chips carry no text that answers it. The icon is the whole
     of their meaning on screen, which is exactly the problem.

     This is WaterConsumptionCardV2's `armedBucket` applied to the chips, and
     its rules carry over one for one, because the edges are what decide
     whether a two-stage tap feels right rather than broken:
       • first tap on a chip           reveal what the type is; never navigate
       • second tap on the SAME chip   navigate, exactly as 7bf0f4f does
       • tap on a DIFFERENT chip       that is ITS first tap — MOVE the reveal
                                       there, do not navigate
       • tap anywhere else             dismiss
       • Escape                        dismiss
       • the counts change             clear it, so a reveal cannot survive
                                       into data it was not describing
     There is NO timer: this is "tap, then tap again", not a double-click, so a
     slow second tap works as well as a fast one.

     KEYBOARD NAVIGATES IN ONE PRESS, deliberately — the same ruling
     WaterConsumptionCardV2 made for the same reason. A keyboard user already
     has the explanation before they press anything, because aria-describedby
     below puts it on every chip permanently and focus reads it out. Making
     them press Enter twice would be two presses to do what one press already
     did, to solve a problem keyboards do not have. `event.detail === 0` is how
     a button tells the click Enter/Space synthesises from a real pointer tap. */
  const [armed, setArmed] = useState(null)
  const rowRef = useRef(null)
  const blurbId = useId()

  /* A reveal must not outlive the numbers it was drawn beside. This is the
     hero's analogue of the consumption card clearing on a window change: the
     counts ARE the view here, so a scope change that repaints them takes the
     reveal with it rather than leaving a sentence pinned to a chip that now
     reads something else. Joined into one string because `counts` is a fresh
     object every render and a bare dep would re-fire on every one.

     RESET DURING RENDER, NOT IN AN EFFECT, and the house already made this
     call — SystemsTableCard:190 clamps its page the same way for the same
     reason. An effect paints the stale frame first and corrects it after, so
     the band would flash against the new numbers for a frame before going
     away; react-hooks/set-state-in-effect refuses it outright, which is the
     rule agreeing with the eye. React's documented shape for "reset state when
     a prop changes" is this one: compare against what we last saw, and set
     during render so the pass is thrown away before it is ever committed. */
  const countsKey = `${counts.topology}|${counts.humidity}|${counts.flood}`
  const [seenCounts, setSeenCounts] = useState(countsKey)
  if (seenCounts !== countsKey) {
    setSeenCounts(countsKey)
    setArmed(null)
  }

  /* A tap outside the chips dismisses, and so does Escape. Both listeners are
     mounted ONLY while something is armed. pointerdown in the CAPTURE phase is
     load-bearing and not a stylistic choice: it runs before the chip's own
     click, so a tap that lands on a different chip is not cleared out from
     under the handler that is about to re-arm it — the exact bug the
     consumption card's note warns about. */
  useEffect(() => {
    if (armed === null) return undefined
    const dismiss = (event) => {
      const el = event.target
      if (el && el.nodeType && rowRef.current && rowRef.current.contains(el)) return
      setArmed(null)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setArmed(null)
    }
    document.addEventListener('pointerdown', dismiss, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [armed])

  const armedType = armed === null ? null : TYPES.find((t) => t.key === armed)
  /* Whether the open chip is the zero case, which is what adds the upsell
     strip to the band below. Read off the SAME `counts` the chip renders, so
     the strip cannot disagree with the numeral that opened it. */
  const armedIsZero = armedType !== null && armedType !== undefined
    && (Number(counts[armedType.key]) || 0) === 0

  return (
    <div
      className={cn('relative shrink-0 w-full h-[130px]', className)}
      data-node-id="199922:85244"
      data-name="Systems overview hero"
    >
      {/* 199466:17470. aria-hidden: weather, not information.

          THE BLEND MODE IS THEME-CONDITIONAL, AND IT HAS TO BE.
          `multiply` is `result = backdrop x source`. In `light` the backdrop
          is --background (#F4F6F9, L=0.957), so the composite works out to
          roughly `0.096 + 0.861 x raster` — i.e. the raster itself, very
          slightly lifted and washed. On a dark ground the backdrop is ~0.09
          and the same expression collapses to `0.009 + 0.081 x raster`: a
          near-black rectangle carrying about 0.3% of a stop. Measured before
          this change, the layer's own internal dynamic range was 1.10:1 under
          dark against 3.14:1 under light. The water art was gone.

          The fix is NOT a scrim and NOT a second asset. Note what the crop of
          this raster actually contains: the <img> below is scaled to 143.88%
          and offset by -17%/-65%, so the visible region is ENTIRELY wave —
          there is no white ground inside this box to knock out. `multiply`
          was never knocking anything out here; it was only tinting the raster
          toward the page. So on every theme but `light` the blend simply goes
          away and the raster paints itself, at the opacity-90 it already has:
          `0.1 x backdrop + 0.9 x raster`.

          That is also, for free, exactly what Apple's HIG asks for -- "if you
          display a content image that includes a white background, consider
          slightly darkening the image to prevent the background from glowing",
          i.e. dim, do not scrim. Compare the two expressions term by term:
          light maps the raster into [0.096, 0.957], dark into [0.009, 0.909].
          The dark composite is UNIFORMLY slightly darker than the light one at
          every input value, so the hero does not glare, and its range widens
          rather than collapsing.

          `light` keeps `mix-blend-multiply` untouched and is pixel-identical.
          The variant is written as "any theme that declares one and is not
          light" rather than naming dark/sand/contrast, so a theme added later
          is handled without editing this file — and a document with no
          data-theme at all (SSR, jsdom) still gets the `light` path. */}
      {/* THE REFETCH CHANGES THE ART IN TWO WAYS, and the second is the whole
          reason `isolate` is on the wrapper.

          ONE: the crop. 180.61/-17.03/-65.08/143.88 became
          211.03/-27.92/-77.24/168.12 — the same raster, pushed in and up. The
          October finding survives it: the visible region is still ENTIRELY
          wave, with no white ground inside the box for `multiply` to knock
          out, which is what made turning the blend off safe in the first
          place.

          TWO: a tint layer that did not exist before. The October node had
          none, and this file said so in as many words ("here the node has no
          tint layer at all, so the raster's own blue comes through"). It has
          one now — a flat #a0ccff at `mix-blend-multiply` over the raster —
          and it is most of what the owner was seeing as "not the latest": it
          is what turns the washed grey-blue band into the saturated one. Raw
          hex, like SystemHeroCard's #ff7b7d and SystemsHealthCard's #ff8904:
          this is a filter over artwork, not a surface a theme re-grounds, and
          the token set has no entry for it.

          `isolate` IS LOAD-BEARING, NOT TIDINESS. A non-normal mix-blend-mode
          already makes an element an isolated group, so under `light` the
          tint could only ever have reached the raster. But the variant below
          turns this wrapper to `mix-blend-normal` on every other theme — and
          `normal` creates NO stacking context, so without `isolate` the
          tint's own multiply would escape the group and multiply against the
          page ground instead. That is precisely the 1.10:1 collapse the block
          above was written to kill, re-entering through the tint rather than
          through the wrapper. SystemsHealthCard:252 made the same call for
          the same reason. `isolation: isolate` pins the tint to the raster on
          every theme and changes nothing under `light`, which already had the
          grouping from the multiply.

          What the group composites to, for the record: the tint is opaque, so
          the wrapper now resolves to an opaque tinted band rather than a 90%
          raster letting the ground through. On the non-light themes that is a
          strict improvement — the hero stops borrowing the near-black ground
          and paints its own blue, with the ink on it unchanged. */}
      {/* `artwork` IS NOT A STYLE SWITCH. The layer is suppressed only when the
          CALLER is already painting this exact raster behind this exact box —
          the Dashboard's full-bleed band, Figma 199954:96290, which runs the
          wave from the top of the screen down to this card's bottom edge. Two
          copies of it in one stack would double the #a0ccff multiply and read
          as a seam at the hero's top edge.

          It is NOT a way to get a transparent hero: there is no caller that
          wants the headline and the chips on the page ground, and --ink-on-color
          is illegible there. If you reach for this prop, check that something
          above you is drawing HeroWaveArt. */}
      {artwork ? (
        <HeroWaveArt
          className="absolute inset-0 rounded-[17px]"
          data-node-id="199466:17470"
        />
      ) : null}

      {/* ── THE LIFECYCLE PILL IS REMOVED, 2026-11-04 ────────────────────────
          A pill reading "Active" with a chevron-down stood here
          (199531:80083, its word 199531:80085, its glyph 199531:80084), on the
          same veiled chassis as the chips, at right-[9px] top-[9px].

          REMOVED ON TWO AGREEING AUTHORITIES. The owner: "we want to replace
          the drop-down for the lifecycle with something much less visible.
          Maybe we can just remove it for now." And the new frame agrees -
          199922:85244 carries two `Active`+chevron frames and both are
          hidden="true".

          NOTHING WAS WIRED TO IT, which is why this is a deletion and not a
          disconnection. It was a <div> holding a <span> and an aria-hidden
          lucide <ChevronDown>: no state, no handler, no prop, no filter, no
          consumer anywhere in the tree. The 2026-11-01 note that stood here
          said so in as many words - "IT IS A LABEL, NOT A CONTROL ... the node
          has no menu, no open state, no second option" - so there is no
          lifecycle state to preserve, and Rule 0 has nothing to fire on. If
          the owner later wants the quieter replacement he mentions, it starts
          from zero: this component was never told about a lifecycle axis and
          inventing its other values would be inventing copy.

          THE GLYPH, for whoever builds that replacement: the node's chevron is
          "Tabler Icons / chevron-down" on an 18.2095 viewBox, which normalises
          to lucide's ChevronDown path for path at stroke 2 on a 24 grid. The
          import went with the markup. */}

      {/* ── THE EYEBROW AND THE HEADLINE — 199954:96289, read live 2026-11-04 ─
          THE HEADLINE IS LEFT-ALIGNED AGAIN, and this is the second reversal
          of the same value in one day. 199922:85244 centred it across the box
          and this file said so; 199954:96289 puts it back on the chip row's
          own inset, which is 23px in the live read (it was 21px in October).
          Both readings are of a frame that is being edited while it is read -
          199954:96290 beside it moved three times in twenty minutes - so the
          note that matters is not which value is right but that this one is
          the LIVE one, fetched after the owner sent the link.

          HOW `text-center` BECAME LEFT. The node still emits `text-center`, on
          a 200px box pinned at x=23. A short string centred in a box that
          starts at 23 lands at ~23 only while it is short: the eyebrow's "12
          Locations" and the headline's "244 systems" both do, which is what
          makes the frame LOOK left-anchored. It is not reproduced as
          centre-in-a-200px-box, because this component's count is live and a
          four-digit fleet would centre somewhere the design never showed. Left
          at 23 is what the render means.

          THE EYEBROW IS NEW — 199955:96839, "12 Locations", 15px, the count
          semibold and the word regular, the same two-weight split the headline
          has always used. It is DATA, not a label: `locations` is the count
          for the scope this hero is already reporting on, and 12 is the
          frame's example value.

          ⚠ COPY: "Locations", capital L, is the FRAME's spelling, transcribed
          per copy rule 0 (Figma copy is transcribed, never authored). It
          CONFLICTS with the catalogue, which spells the same count
          `home.counts_locations_other` = "{{count}} locations", lower case,
          and with the everyday register's sentence-case rule. Neither was
          silently picked over the other: the frame is what is drawn and the
          conflict is reported. No new catalogue key was added, because adding
          one would read as a ruling.

          THE COLUMN. Eyebrow at leading-[18px] then headline at
          leading-[39.37px] stacks to 2..59.4 inside this box, which puts the
          chip row's 62 clear of the descenders; the node's own boxes are
          -23.76..11.88 and 10.8..45.1, i.e. they overlap, because Figma
          reports a text node's LINE box and both of these carry a 39.37px
          line on 15px and 34.646px glyphs. A flow column is the honest
          translation of two stacked lines and does not depend on reading that
          overlap correctly. */}
      <div
        className="absolute left-[23px] right-[23px] top-[0px] z-[2] flex flex-col items-start"
        data-node-id="199954:96294"
      >
        {locations === null || locations === undefined ? null : (
          <p
            className={cn(
              '[word-break:break-word] whitespace-nowrap text-ink-on-color text-[15px]',
              'font-sans',
            )}
            dir="auto"
            data-node-id="199955:96839"
            data-name="hero-locations"
          >
            <span className="font-semibold leading-[26px]">{`${fmt(locations)} `}</span>
            <span className="font-normal leading-[26px]">
              {Number(locations) === 1 ? locationsUnitLabel.replace(/s$/, '') : locationsUnitLabel}
            </span>
          </p>
        )}

        <p
          className={cn(
            /* leading AFTER the size, and on the <p> as well as on the spans:
               the paragraph's own strut is what sizes the line box, and without
               it this ran to 52px (34.646 x the inherited normal) and the chip
               row at 72 landed 6px INSIDE the headline. Measured in Chromium at
               393x852, not reasoned about. */
            '[word-break:break-word] whitespace-nowrap text-ink-on-color text-[34.646px] leading-[39.37px]',
            'font-sans',
            String.raw`font-semibold`,
          )}
          dir="auto"
          data-node-id="199466:17471"
        >
          <span className="leading-[39.37px]">{`${fmt(total)} `}</span>
          <span className={cn('font-sans', 'font-normal leading-[39.37px]')}>{unit}</span>
        </p>
      </div>

      {/* 199531:80031 — the three chips. They are a row rather than three
          absolutes, because the node's offsets were measured against the
          node's own numerals and a four-digit count would overlap its
          neighbour.

          EVENLY SPREAD, 2026-11-04 — REVERSED THE SAME DAY. 199922:85244
          stopped bunching them at the left on a 5px gap and spread them across
          the box; the live read of 199954:96289 bunches them again, at x=23,
          107 and 189 on chips 79/77/79 wide — a 5px gap, left-anchored, 245 of
          the block's 358. So the row is back to `gap-[5px]` with no right
          anchor. Both readings are hours apart on a frame being edited live;
          this one is the one the owner linked.

          WHAT THE SPREAD WAS BUYING, and what is lost with it: the chips are
          content-sized here, not fixed at the node's 79/77/79, so a four-digit
          count grows its own chip. The spread absorbed that growth; a fixed
          gap lets the row's right edge move with the data. It cannot overflow
          the box — three chips at four digits is ~300 against 358 — but the
          row is no longer optically balanced at every count, and that is the
          node's design rather than an oversight here.

          THE VERTICAL. The box is 130 tall — 199954:96289's "Main header" is
          162 and its last 36 are the tab row, which the page draws as a
          sibling immediately below. The health card is no longer in this block
          at all and no longer overlaps this box; it sits below the tabs now.
          Eyebrow 0..26, headline 26..65.4, chips 72..106.6, 23px of artwork
          left below them — the node leaves 34, and the 9px between the headline’s
          descenders and the chips is the node’s 12 measured the same way. */}
      <div
        ref={rowRef}
        className="absolute flex items-center gap-[5px] left-[23px] top-[72px] z-[2]"
        data-node-id="199531:80031"
      >
        {TYPES.map(({ key, name, type, glyph, size }) => {
          const count = Number(counts[key]) || 0
          /* 7bf0f4f's rule is UNCHANGED: a chip reading 0 never navigates,
             because it would route to an empty table — a dead end dressed as a
             control. What changed is that it is no longer INERT.

             The explanation is about the TYPE, not about the data. "What is a
             flood sensor" has the same answer whether this account owns 25 of
             them or none, and the viewer staring at a 0 is arguably the one
             most likely to be asking. So a zero chip is now a button that
             explains and refuses to navigate, rather than a picture that does
             neither. Its accessible name drops the "Show these in the Systems
             tab." clause accordingly: a control must not name a destination it
             will not go to.

             THE ZERO CHIP NAMES WHAT THE TAP DOES, 2026-11-04. `Flood
             sensors: 0` is a reading, not a control: it tells a screen-reader
             user the chip's value and nothing about why it is focusable. The
             zero name now carries the gesture's outcome instead, which is the
             same contract the navigating name has had since 7bf0f4f - say the
             destination, and only the one you will actually reach. Two of the
             three chips read 0 against this dataset (systemType.js: the MRG
             snapshot carries no flood and no humidity device), so this is the
             ORDINARY case on this screen, not an edge.

             The HANDLER gate stays at the component boundary, though. With no
             onSelectType at all the chips are still the inert pictures the
             frame draws and this component's prop contract promises — the host
             gets no affordance it did not ask for. */
          const navigates = count > 0 && typeof onSelectType === 'function'
          const inner = (
            <>
              <span
                aria-hidden="true"
                className="relative shrink-0 text-ink-on-color"
                style={{ width: size, height: size }}
              >
                {glyph}
              </span>
              <span className={CHIP_NUM} dir="auto">{fmt(count)}</span>
            </>
          )
          if (typeof onSelectType !== 'function') {
            return (
              <span
                key={key}
                className={CHIP}
                role="img"
                aria-label={`${name}: ${fmt(count)}`}
                aria-describedby={`${blurbId}-${key}`}
              >
                {inner}
              </span>
            )
          }
          return (
            <button
              key={key}
              type="button"
              onClick={(event) => {
                /* `detail === 0` is Enter or Space: the click a browser
                   synthesises for a keyboard activation carries no pointer
                   detail. Keyboard skips the arming stage entirely — see the
                   block at the top of this component for why. */
                const act = () => {
                  if (navigates) {
                    /* Clear BEFORE handing over. The page switches tab under a
                       hero that stays mounted, so a reveal left armed here
                       would still be sitting there when the viewer came back —
                       the "must not persist after the user looks away" case. */
                    setArmed(null)
                    onSelectType(type)
                    return
                  }
                  /* Nothing to navigate to, so the second press closes what the
                     first opened. A control whose repeat press does nothing at
                     all reads as broken. */
                  setArmed((cur) => (cur === key ? null : key))
                }
                if (event.detail === 0) {
                  act()
                  return
                }
                if (armed !== key) {
                  setArmed(key)
                  return
                }
                act()
              }}
              aria-label={
                navigates
                  ? `${name}: ${fmt(count)}. Show these in the Systems tab.`
                  /* NEW COPY - the gesture clause only. The noun and the count
                     are the frame's; "What are these?" is the shortest honest
                     name for a control that opens an explanation and goes
                     nowhere. Alternatives for the owner: "Learn about these."
                     / "About this system type." */
                  : `${name}: ${fmt(count)}. What are these?`
              }
              aria-describedby={`${blurbId}-${key}`}
              aria-expanded={armed === key}
              className={cn(
                CHIP,
                'cursor-pointer appearance-none border-0 transition-colors',
                'hover:bg-[rgba(241,245,249,0.42)] active:opacity-80',
                'outline-none focus-visible:ring-[3px] focus-visible:ring-white/70',
              )}
            >
              {inner}
            </button>
          )
        })}
      </div>

      {/* THE EXPLANATION, RENDERED TWICE — once for eyes, once for assistive
          tech, and deliberately not as one shared element.

          FOR ASSISTIVE TECH: a permanent sr-only sentence per chip, pointed at
          by aria-describedby. It is present whether or not anything is armed,
          so a screen-reader user meets the explanation by FOCUSING a chip and
          never has to discover a two-stage gesture to reach it. That is also
          what makes it honest for Enter to navigate on the first press: the
          stage being skipped is one that held nothing back from them.

          FOR EYES: the band below. It is aria-hidden PRECISELY BECAUSE the
          sentence it shows is already on the chip as a description — announce
          it again on appearance and a screen reader says everything twice.
          aria-expanded on the chip is what tells a screen-reader user that the
          thing sighted users can now see is open.

          NOT A PORTAL, AND THAT IS NOT A PREFERENCE. The phone frame is
          393x852 with overflow:hidden (src/components/Phone.jsx) and a Radix
          popover portals to document.body, which escapes that frame by design —
          the failure ValveConfirmSheet:17-25 documents and this repo has been
          bitten by three times. This is the house `absolute` overlay instead.
          It may hang below the hero's own 150px because the hero root sets no
          overflow (only the wave wrapper does), and z-[2] carries it over the
          health card the page pulls up by 37px at z-[1]. A Radix Tooltip is
          doubly wrong here and not only for the portal: a tooltip is a HOVER
          affordance and this is a touch device, so hover alone reaches nobody.
          The gesture is a tap, and the chip is the control that takes it.

          TOKENS, NOT HEX, because four themes are live: --card, --border,
          --foreground and --muted-foreground are each redefined under `dark`,
          `sand` and `contrast`, so the band re-grounds itself per theme rather
          than staying a light card on a dark screen. */}
      {/* THE DESCRIPTION, FOR ASSISTIVE TECH. The panel's prose is
          aria-hidden - it would otherwise be announced twice - so this sr-only
          run is the ONLY route a screen reader has to those words, and it is
          present on every chip whether or not anything is armed.

          IT NO LONGER BRANCHES ON THE COUNT, 2026-11-04. It used to append the
          per-type benefit line for a chip reading 0, because that line was the
          only thing on the panel that told a 0 what to do about itself and it
          lived inside the hidden prose. The owner cut the benefit lines, so
          there is nothing left to append and both branches said the same
          thing; the ternary went with them.

          WHAT A ZERO CHIP NOW ANNOUNCES, checked rather than assumed: its
          aria-label ("Flood sensors: 0. What are these?"), then this
          description ("Flood sensors. A spot sensor that reports water
          reaching somewhere it should not."). Neither is empty, and the sales
          route is NOT lost with the benefit line - the CTA is a real <a> with
          its own accessible name, sitting outside the hidden prose precisely
          so it stays reachable. */}
      <div className="sr-only">
        {TYPES.map(({ key, name, type }) => (
          <span key={key} id={`${blurbId}-${key}`}>{`${name}. ${SYSTEM_TYPE_BLURB[type]}`}</span>
        ))}
      </div>

      {armedType ? (
        <div
          data-name="System type explainer"
          data-zero={armedIsZero ? 'true' : undefined}
          /* 23/23/98 since the 2026-11-04 live read, from 21/21/104: the chip
             row moved to left-[23px] top-[62px] and this panel hangs 4px under
             it, as it always has. It still OVERFLOWS the hero box on purpose -
             nothing here clips but the artwork wrapper. What it overflows ONTO
             changed: it used to land on the health card and now lands on the
             tab row, which is why the page gives this hero a z-index above its
             sibling. Without that the panel would paint UNDER the tabs. */
          className="absolute left-[23px] right-[23px] top-[111px] z-[2] rounded-[14px] border border-border bg-card px-[14px] py-[10px] shadow-lg"
        >
          {/* THE aria-hidden MOVED INWARD, and it had to. It used to sit on
              the panel root, which was correct while the panel was only text
              already carried by the sr-only description. The panel now holds a
              LINK, and a focusable element inside an aria-hidden subtree is
              hidden from assistive tech while still being tabbable - the worst
              of both. So only the prose is hidden (it is still duplicated, so
              it would otherwise be announced twice) and the link is left
              reachable with a name of its own. The zero chip's description
              carries the benefit line too; see the sr-only block above. */}
          <div aria-hidden="true">
            <p className="text-[13px] font-semibold leading-[18px] text-foreground">
              {armedType.name}
            </p>
            <p
              data-name="System type description"
              className="mt-[2px] text-[12px] leading-[16px] text-muted-foreground"
            >
              {SYSTEM_TYPE_BLURB[armedType.type]}
            </p>
          </div>
          {/* ── THE SALES CTA, drawn only at 0.
              IT LEAVES THE APP AND IT LOOKS LIKE IT DOES. The glyph is
              lucide's ArrowUpRight, not the ArrowRight this app uses for its
              in-app "Show all" / "Show past alerts" - a right arrow means "go
              on to the next thing HERE", and the up-right arrow is the
              convention for "this opens somewhere else". Two destinations on
              one screen have to be tellable apart by eye as well as by ear,
              which is the same argument SystemHealthCard makes for its
              segment names.
              `rel="noopener noreferrer"` is not optional on a `target=_blank`:
              without it the opened page gets a handle on this window. Same
              pattern ControlPanel.jsx:477 already uses.
              THE ACCESSIBLE NAME says the type, the outcome and the fact that
              it leaves - the arrow cannot say that to a screen reader. */}
          {armedIsZero ? (
            <a
              href={SALES_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-name="System type sales cta"
              aria-label={`${UPSELL_CTA} about ${armedType.name}. Opens wint.ai in a new tab.`}
              className={cn(
                'mt-[10px] inline-flex items-center gap-[6px] rounded-[10px] no-underline',
                'bg-primary px-[12px] py-[7px] text-primary-foreground',
                'text-[12px] font-semibold leading-[16px]',
                'transition-opacity hover:opacity-90 active:opacity-80',
                'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              )}
            >
              <span>{UPSELL_CTA}</span>
              <ArrowUpRight aria-hidden="true" focusable="false" size={14} className="shrink-0" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
