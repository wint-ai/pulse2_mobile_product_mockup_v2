/**
 * ValveManagementScreen — where valves are actually MANAGED.
 *
 * DESIGN SOURCE: none. A survey walked every page of the Figma file and found
 * no valve-management, bulk-action, multi-select or status-breakdown frame to
 * transcribe. This screen is net-new from the design system, structurally like
 * `AccountScreenV2.jsx:4` and `BulkValveConfirmSheet.jsx:4`. EVERY VISIBLE
 * STRING BELOW IS NEW COPY AWAITING THE OWNER'S APPROVAL and is marked
 * `NEW COPY` at its site. The exceptions, which are NOT new and must not be
 * reworded here:
 *   · the four valve words — `Valve Error` · `Open` · `Closed` ·
 *     `No valve installed` — come from `VALVE_CATEGORIES` (`valveScope.js`),
 *     which takes them verbatim from Figma board 199535:96542;
 *   · the offline words — `Offline` / `System is offline` — are the product's
 *     own (`src/i18n/locales/en.json:348-355`). "Unreachable" appears nowhere
 *     in this product and is never introduced here.
 * No `t()`: only 2 of 36 v2 components use i18n and no v2 valve surface does.
 *
 * ── WHY THIS SCREEN EXISTS ───────────────────────────────────────────────
 * The owner, verbatim: "i dont like the way its built. the widget needs to be
 * display only for managing valve i want to open a dedicated screen so user
 * can select/deselect specific valves can filter per location / etc. main
 * widget is display only".
 *
 * So `ValveManagementCard` is a readout and THIS is the control surface:
 * per-SYSTEM select / deselect, filtering by location, by valve state and by
 * connectivity, then one bulk open or close over exactly what was selected.
 *
 * His earlier framing still binds and is the reason for most of the rules
 * below: "this is like a super dangerous operations when user can shut off
 * valve for around 1000 valve or 100 valves. So we need some pop-up messages,
 * and we need to select deselect. We need to understand the context of
 * systems." And: "we have a kind of an offline devices that Valve cannot be
 * shut off. So we need to explain the user this situation somehow and to not
 * let him think that this Valve will take place on this operation that he
 * wants to."
 *
 * ══ THE 2026-11-02 REDESIGN ══════════════════════════════════════════════
 * The owner, looking at the first cut: "once someone wants to manage valves,
 * the UI looks very odd... It needs to be much more clear, much more easy to
 * understand to open, close the valves, to see statuses. Currently it's kind
 * of a mess. It needs to be much more simple."
 *
 * THE MEASURED PROBLEM, AND IT IS THE WHOLE STORY. Fixed chrome was 509px of
 * 808px usable, leaving ~299px — 4.9 rows at the old 61px row — for a fleet of
 * 103 systems. SIXTY PER CENT OF THE SCREEN WAS FURNITURE and the list the
 * screen exists for got five rows. Everything below is in service of that one
 * number. Where the 509 went: header 59 · SummaryCard 166 · quick-filter row
 * 32 · select-all bar 56 · action bar 84 · TabBar 64 · padding and gaps 48.
 *
 * 1. THE SUMMARY CARD IS GONE (166px, the single largest piece of furniture).
 *    It drew the category list a SECOND time (a legend) directly above the
 *    quick-filter chips, which drew it a third; and it drew the part-to-whole
 *    a second time (the overview card already owns that chart). The UK
 *    Analysis Function's rule for a chart whose categories are already named
 *    on screen: "Do not use a key, label the categories themselves."
 *    SO THE COUNTS AND THE FILTER ARE NOW ONE CONTROL. Each chip carries its
 *    own swatch, its own word and its own count: the chip row IS the
 *    breakdown and IS the filter, and there is no second surface to keep in
 *    sync. The card's `<CardDescription>` was also the scope label's SECOND
 *    drawing (`MobileHeaderBar` has it, and the confirm sheet has it); that
 *    duplicate goes with the card.
 *    The page's `<h1>` survives as `sr-only`. `MobileHeaderBar` names the
 *    scope visually and the user arrived by pressing "Manage valves", so a
 *    second visible title was 24px of restatement — but a screen whose title
 *    has no heading role is a screen a rotor cannot find, so the role stays.
 *
 * 2. ROWS ARE `src/components/ui/item.jsx` — the shadcn list-row primitive,
 *    ported 2026-11-02. `<Item size="sm">` is `gap-2.5 px-4 py-3`, inside an
 *    `<ItemGroup>` with `<ItemSeparator>`. The hand-rolled three-track grid is
 *    gone, and with it the row's own gap, padding, radius, focus ring and
 *    title weight — all of which were re-picked here and drifted from every
 *    other list in the app.
 *
 * 3. THE ENCODING BUG IS FIXED, and the fix is the spine of the redesign.
 *    The old row rendered `{reachable ? <StateBadge/> : <OfflineBadge/>}` —
 *    ONE SLOT, so an offline row showed NO VALVE STATE AT ALL. Tapping the
 *    "Open" filter produced rows badged "Offline", contradicting the filter
 *    that produced them, while the overview card showed the same systems as
 *    Open. Two surfaces disagreeing about the same two facts.
 *
 *      VALVE POSITION OWNS HUE AND THE WORD. CONNECTIVITY IS ENCODED BY
 *      STEPPING THE ROW'S INK DOWN, PLUS THE WORD "Offline" AND AN AGE.
 *      NEVER A SECOND COLOURED DOT.
 *
 *    Bertin is the warrant: HUE is *selective* (you pick out all the greens in
 *    one sweep) so it belongs to the primary dimension; LIGHTNESS is
 *    *dissociative* — a dimmed row visually leaves the group, which is exactly
 *    "not in the actionable set"; SHAPE is never selective, so a second small
 *    dot would not let anyone scan 103 rows for the offline ones, it would
 *    only add a mark to decode. Carbon: "avoid the same shape with different
 *    colors within the same experience", and past 5-6 indicators a list stops
 *    being scannable. Fluent 2 allows exactly ONE overlay per item and warns
 *    that badges on <=32px targets are hard to see — a 6px second dot on a
 *    393px phone is under their own floor. Most directly: Shopify SHIPPED a
 *    two-dimension badge (`tone` plus an orthogonal `progress` fill) and then
 *    DELETED it — "Progress must be conveyed through the label and tone...
 *    Don't rely on a partially filled indicator." "Open but offline" is
 *    structurally the same problem as "partially fulfilled" and gets the same
 *    answer: THE LABEL CARRIES IT. `<ValveStateReadout>` says
 *    `Last known: Open`; the row says `Offline · Last seen 26h ago`.
 *
 *    THE "DIM" IS A TOKEN STEP, NOT AN OPACITY. `opacity-65` on a row would
 *    push `text-muted-foreground` under 4.5:1 and break WCAG 1.4.3 on the one
 *    row whose text matters most. So an offline row steps its TITLE from
 *    `text-foreground` to `text-muted-foreground` — a designed, contrast-
 *    checked lightness step in all four themes, which is the dissociative cue
 *    Bertin is asking for without inventing a colour value.
 *
 * 4. GROUPING, so the row's second line can go away. The old row carried
 *    `path · last known: X · Last seen Y` on a wrapping second line — 61px
 *    EVERY row, with the path repeated for every system at the same address.
 *    The path now sits ONCE PER GROUP and the rows under it carry name + state
 *    on ONE line (measured 45.3px). Only an OFFLINE row still spends a second
 *    line, on the two facts that are actually per-row: `Offline` and its age.
 *    The path has NOT been dropped from the row's accessible name — a
 *    screen-reader user tabbing between checkboxes never sees the group
 *    header, so it stays in the `aria-label`. "We need to understand the
 *    context of systems" is satisfied by both routes.
 *    THE GROUP HEADER WAS A STICKY FULL-BLEED BAND until 2026-11-03 and is now
 *    a quiet label inside a per-location CARD. See THE 2026-11-03 PASS below;
 *    nothing about the path's two routes changed with it.
 *
 * 5. ONE SELECTION STRIP instead of a select-all bar and an action bar
 *    (56 + 84 = 140px of two separately-bordered hand-rolled cards sitting
 *    48px from a real `<Card>` at a different radius). It is one bordered
 *    surface whose second half appears on the first selection.
 *
 * 6. THE `none` FILTER: KEPT AS A CHIP, DEAD END REMOVED AT THE DESTINATION.
 *    See the long note at `showSelectAll` below.
 *
 * NET, AS ARITHMETIC (written before this repo had a browser; MEASURED on
 * 2026-11-03 and the arithmetic held): header 59 + chips 32 + strip 46 +
 * TabBar 64 + padding 16 + gaps 24 = 241 with no selection, and 314 with one
 * (the strip's action half is +73). So 509 -> 314 and the list goes 299 ->
 * 494. The browser says the scroller is 361x585 at y=115 and that TEN rows are
 * fully visible at rest, which is the 4.9 -> ~9.7 that was predicted.
 *
 * ══ THE 2026-11-03 PASS — THE LIST BECOMES A STACK OF CARDS ══════════════
 * The owner, verbatim: "when we go to manage valves, this components looks
 * kind of an odd. Maybe we need to use a different component for this table
 * view cards view or something. There looks a bit odd. We need to fix it."
 *
 * He is right, and for the first time this could be CHECKED rather than
 * reasoned about: `scripts/shot.mjs` landed the same day and every number
 * below is off a real 393x852 Chromium frame, not off a sum of class strings.
 *
 * WHAT WAS ODD, MEASURED. THE LIST WAS THE ONE SURFACE IN THIS APP WITH NO
 * CARD SURFACE AT ALL. Every sibling — the Home stack, the result banner, the
 * empty state, and the select-all strip at the foot of THIS screen — is a
 * rounded card (`bg-surface-card`, `rounded-[18px]`, `border-card`). The rows
 * here sat directly on `--app-bg`, so the list read as unstyled. Worse, the
 * per-location `<h2>` was a FULL-BLEED OPAQUE WHITE BAND (`bg-card border-y`,
 * x=16->377, 30px): the only opaque white in the list, so the HEADERS read as
 * the content and the ROWS read as background — an inversion of the actual
 * hierarchy. And the strip was the only card-shaped thing on screen, which
 * made the mismatch louder rather than quieter.
 *
 * THE FIX IS ONE CARD PER LOCATION. Each `rowGroups` entry is a house-chassis
 * card in a `gap-2` stack; the path is a quiet `text-xs text-muted-foreground`
 * header INSIDE it over an inset hairline; the rows keep `<ItemGroup>` +
 * `<ItemSeparator>` with the rules inset 16px so they stop short of the 18px
 * corner (the treatment the Home stack's own cards use). The strip takes the
 * same chassis, so there is now exactly ONE card treatment on this screen.
 *
 * THE STICKY HEADER WAS DROPPED. IT WAS A REAL WIN AND THIS IS A REVERSAL, SO
 * IT IS ARGUED RATHER THAN ASSERTED, AND IT IS PINNED BY TEST:
 *   a. THE CARD'S BORDER IS THE STRONGER CUE. Sticky existed because in an
 *      undifferentiated 103-row list nothing but that band said where a row
 *      lived. A bordered container says it at EVERY scroll position and cannot
 *      scroll away. What is lost is not "which group am I in" — that is now
 *      structural — but only the group's NAME while deep inside a tall card.
 *   b. THE FLEET MAKES THAT LOSS SMALL. Measured: 103 systems over 17 leaf
 *      locations, group sizes 2-10 and twelve of the seventeen at 5 or fewer.
 *      A 5-row card is 261px against a 585px scroller, so its header is on
 *      screen essentially the whole time the card is. Even the largest group,
 *      10 rows, is 493px — still shorter than the scroller.
 *   c. IT IS NOT ACTUALLY AVAILABLE INSIDE THE CHASSIS. `overflow-hidden` is
 *      what clips the last row's `hover:bg-accent/50` fill to the 18px corner,
 *      and an `overflow: hidden` ancestor BECOMES the sticky element's scroll
 *      container — a box that never scrolls, so the sticky goes inert. Keeping
 *      `sticky top-0` in the source would have meant either hand-rolling the
 *      corner clipping off the house chassis, or shipping a class that reads
 *      as sticky and does nothing. An honest static header beats both.
 * REVISIT IF the dataset ever yields a location group taller than the
 * scroller: the route back is to drop `overflow-hidden` and clip the last row
 * explicitly, and the trade in (c) flips.
 *
 * THE ROW'S THREE COLUMNS NOW SHARE A CENTRE LINE. `<ItemActions>` carried
 * `self-start`, which top-aligned the state readout against a centre-aligned
 * checkbox and title: measured at 1.63px of rise, which is small per row and
 * reads as a wobble down a list of them. Measured at 0 after.
 *
 * THE HEIGHT COST, MEASURED, BECAUSE ~17 CARDS OF CHROME IS REAL SCROLL.
 * Per group BEFORE: a 30px band and no gap. AFTER: 28px header + 1px rule +
 * 2px of card border + the 8px stack gap = 38.8px, i.e. +8.8px per group. A
 * 5-row section went 260.3px -> 261.3px and the whole 40-row page 2241px ->
 * 2314px. ROWS FULLY VISIBLE AT REST: 10 BEFORE, 10 AFTER. The card surface
 * costs no row.
 *
 * ══ SELECT-ALL AT TWO SCOPES (2026-11-03, same day) ══════════════════════
 * The owner, verbatim: "I want select all for the entire for all systems, and
 * select all per location."
 *
 * There was ONE select-all — the strip, covering everything that matches the
 * filter across every location. It is unchanged, tri-state box and all three
 * of its explanatory sentences included. The SECOND scope is a tri-state box
 * in each location card's header, and it is the reason this requirement
 * arrived mid-flight: the card header the pass above introduced is the only
 * place on this screen that is unambiguously about exactly one location.
 *
 * TWO SELECT-ALLS ON ONE SCREEN IS A SAFETY PROBLEM BEFORE IT IS A LAYOUT
 * ONE, so the whole design is about making each one's REACH unmistakable:
 *   · THE PER-LOCATION BOX REACHES that location's SELECTABLE systems that
 *     match the CURRENT FILTER — including any below the `PAGE_SIZE` cut. It
 *     is built from `selectableFiltered`, never from `shown`. The alternative
 *     — stopping at the fold — would put two select-alls on one screen with
 *     two different and INVISIBLE reaches, which is strictly worse than one.
 *     It is the same rule "select-all covers all N" already states for the
 *     strip. See `selectableByLocation` for the full argument.
 *   · THE NUMBER ON SCREEN IS THAT REACH. The badge in each header is the
 *     count the box will take, not the count of rows drawn beneath it, so the
 *     one card a page boundary can truncate visibly carries a badge larger
 *     than its own row count, with the paging line below spelling out why.
 *   · THE ACCESSIBLE NAME CARRIES THE SCOPE AND THE NUMBER
 *     ("Select all 3 systems at 100 Meridian Plaza · Office"), plus an
 *     "including N not shown" clause when the box reaches past the fold.
 *   · A LOCATION WITH NOTHING SELECTABLE GETS NO BOX AT ALL, not a disabled
 *     one — the same dead-end removal the `showSelectAll` note argues for.
 *   · THE HEADER IS THE 44px TARGET, measured, not the 18px box.
 * Nothing downstream needed changing: `willAct`, `hiddenSelected` and
 * `blockedSelected` all derive from `selectedIds`, so a selection made from a
 * card header is indistinguishable from one made row by row. That is asserted
 * rather than assumed.
 *
 * ══ THE 2026-11-04 PASS — ONE DOOR ═══════════════════════════════════════
 * The owner, verbatim, on a screenshot of this screen's filter row: "I want to
 * hide everything under filters. I had it some of them are filters and some of
 * them are not. Use the shadcn filters, don't invent something that looks from
 * different app. Make search for locations, all the rest doesn't need any
 * search. Make it easy to use."
 *
 * THE CHIP ROW IS GONE. Points 1 and 6 of the 2026-11-02 redesign above are
 * PARTIALLY SUPERSEDED by this pass and are kept for the argument that put the
 * chips there; read them with this note beside them.
 *
 * WHAT WAS WRONG, MEASURED IN A REAL 393x852 FRAME ON 2026-11-04:
 *   a. TWO KINDS OF CONTROL DOING ONE JOB. Valve state was a `ToggleGroup` on
 *      the page; location and connectivity were behind a button. The user had
 *      to learn that "filters" meant two different gestures depending on which
 *      filter. That is the inconsistency he names in his first sentence.
 *   b. IT OVERFLOWED. The chip scroller measured 643px of chips in a ~268px
 *      slot on `/valves`, which is the sliced `Clos...` in his screenshot. The
 *      three affordances it carried - an alpha mask, matching trailing padding
 *      and proximity snap - were treatment for the symptom of putting a list
 *      that grows with the catalogue on a row that cannot.
 *
 * WHAT IS THERE NOW: ONE full-width `FilterSheetTrigger`, and behind it the
 * SHARED `src/v2/components/FilterSheet.jsx`, which /alerts adopted the same
 * day under the same instruction ("Use only shadcn component again"). The
 * local `ValveFilterSheet` that lived in this file is deleted - see the note
 * at its old site for what moved and what the shared component gained to carry
 * this screen. ONE FILTER PATTERN IN THE APP, not two that look alike.
 *
 * HEIGHT IS A WASH AND THAT IS DELIBERATE. `size="sm"` is h-8, which is what
 * the chip scroller measured, so fixed chrome is unchanged at 241px and ROWS
 * FULLY VISIBLE AT REST ARE 10 BEFORE AND 10 AFTER on `/valves` (measured, not
 * summed). This pass buys consistency and a row that cannot clip; the rows
 * were bought on 2026-11-02 and are not given back.
 *
 * THE TWO THINGS THAT GENUINELY CHANGED BEHAVIOUR, both flagged to the owner:
 *   · THE STATE FILTER IS MULTI-SELECT. It is a checkbox group like the other
 *     two now. `matchesFilter` always read `filter.state` as a set, so this is
 *     an addition - `Open` plus `Closed` in one pass - and `?state=` still
 *     seeds exactly one key.
 *   · `All 103` IS GONE. The scope total rode on the All chip and the shared
 *     sheet has no "all" row in a multi group, because this app spells no
 *     constraint as nothing ticked. The four state counts still sum to it and
 *     all four are on screen, which is the whole reason the `none` category
 *     keeps a filter of its own.
 *
 * ══ PROJECT COPY STANDARD, APPLIED 2026-11-03 ════════════════════════════
 * Two rules from the private sandbox, binding project-wide:
 *   · `CLAUDE.md:268`, restated at `docs/DESIGN-GUIDE-FOR-CLAUDE.md:49` —
 *     HYPHENS IN UI COPY, NEVER EM-DASHES. Six strings on this screen were in
 *     breach and are fixed. `aria-label`s are included because they are read
 *     aloud: they are UI copy. CODE COMMENTS ARE NOT, which is why this header
 *     still uses them freely, and the test that pins the rule strips comments
 *     before it looks.
 *   · `docs/wint-format-standards.md` — THE THOUSANDS SEPARATOR IS A COMMA.
 *     Every count that reaches the screen now goes through `num()`. The owner
 *     sized this feature at "around 1000 valve", so four-digit counts are the
 *     case it is built for even though the demo fleet is 103.
 * NOT CHANGED, DELIBERATELY: `formatLastSeen` (`src/utils/format.js`) returns
 * `Today HH:MM` / `Yesterday HH:MM` / `Mon D, HH:MM`, which is ABSOLUTE and so
 * already satisfies the standard's ban on relative time past one minute. It
 * uses a comma where the standard's card format shows a middle dot; that file
 * has many other callers and is not this screen's to edit.
 *
 * ── BUILT ON `src/components/ui/`, NOT HAND-ROLLED ───────────────────────
 * The first cut drew its own pills, its own tick box, its own card and its own
 * badges, and the owner's verdict was "why you didnt used the shad cn
 * components fot this it looks very bad". He is right, and it is not a taste
 * call: a bespoke control cannot inherit a token change, a focus-ring fix or a
 * theme, so it drifts out of the design system the moment either moves.
 *
 *   <Item>/<ItemGroup>/<ItemSeparator>   every system row
 *   <FilterSheet>/<FilterSheetTrigger>   the whole filter surface and the one
 *                                        control that opens it, SHARED with
 *                                        /alerts (2026-11-04). The state chips
 *                                        that used to be a `<ToggleGroup
 *                                        type="single">` on this row are three
 *                                        checkbox rows inside it; see the
 *                                        2026-11-04 note above
 *   <Checkbox>                           every tick box
 *   <Button>                             the actions, Show more
 *   <Card>                               the result banner and the two empty
 *                                        states. The LOCATION cards and the
 *                                        selection strip are NOT `<Card>`:
 *                                        they wear `LOCATION_CARD`, the house
 *                                        chassis copied from
 *                                        `ValveManagementCard.jsx`'s `CARD`,
 *                                        which is the 18px treatment the rest
 *                                        of this app's surfaces use and which
 *                                        shadcn's `<Card>` does not match
 *   <Badge>                              counts that are not themselves a
 *                                        control
 *   <Separator>                          the rules the Item primitives do not
 *                                        already draw
 *
 * TYPE AND SPACING ARE THE SHADCN SCALE. The old file wrote FIVE distinct
 * `text-[Npx]` sizes and 23 distinct arbitrary spacing values. `text-sm` is
 * body, `text-xs` is for badges and secondary lines only, secondary ink is
 * ALWAYS `text-muted-foreground`, spacing is the 4px scale, radius is
 * `rounded-md` / `rounded-xl` / `rounded-full` by role, and `shadow-sm` is the
 * ceiling. The one surviving arbitrary value is `CHIP_FADE_WIDTH`, which is a
 * mask geometry rather than a spacing step.
 *
 * ── WHAT THIS SCREEN IS NOT ALLOWED TO KNOW ──────────────────────────────
 * It derives NOTHING about valves. `valveScope.js` is the single source of
 * what a state means and what may be commanded; this file asks
 * `valveCategoryOf` / `isReachable` / `isSelectable` / `canActuate` /
 * `blockedReasonOf` / `summariseValves` and renders the answer. The local
 * `isSelectable` that used to live here moved INTO that module line for line
 * on 2026-11-02, with `valveCertaintyOf` and `valveReadingOf` beside it; a
 * second copy of an eligibility rule living in a screen is the exact defect
 * that module was extracted to prevent (`valveScope.js:12-18`). The local
 * `Swatch`, `StateBadge`, `OfflineBadge`, `SEG_CLASS`, `GLYPH` and
 * `ALL_LABELS` are gone the same way, into
 * `src/v2/components/ValveStateReadout.jsx`.
 *
 * ── DEEP LINK ────────────────────────────────────────────────────────────
 * `?state=<VALVE_CATEGORIES key>` seeds the state filter, e.g.
 * `/valves/320%20Summit%20Blvd?state=open`. The overview card's stat row
 * navigates here with exactly that, so a tap on its Open count lands with Open
 * already applied. An unknown or absent value falls back to All rather than to
 * an empty list — a deep link that renders nothing is indistinguishable from a
 * broken scope. Re-seeded on every change of `location.search`, so arriving
 * from a second link without unmounting re-applies.
 *
 * ── SCALE ────────────────────────────────────────────────────────────────
 * Two locked PRD decisions apply: "Don't load 1000 systems at once"
 * (`00-index.md:89`) and lazy loading / virtual scrolling for long lists
 * (`01-overview.md:60-63`), with a 500-system memory budget
 * (`16-technical-requirements.md:191`). The demo fleet is 103 systems so
 * nothing visibly breaks — but an unbounded list is not shipped. Rows are
 * PAGED at `PAGE_SIZE` and the page SAYS WHAT IS NOT DRAWN. WHAT IS DROPPED IS
 * ONLY THE DRAWING: select-all-matching selects all MATCHING systems, not all
 * RENDERED ones, and the strip counts the whole selection — nothing on this
 * screen derives a number from `shown`.
 *
 * ── SELECTION IS A SET OF STABLE IDS, NEVER A PREDICATE ──────────────────
 * "Select all N" materialises ids at click time. A predicate re-evaluated at
 * submit time is how a bulk tool silently acts on rows the user never saw.
 * The corollary, which is pinned by test: CHANGING A FILTER NEVER TOUCHES THE
 * SELECTION. `applyFilter`, `setStateChip` and the `?state=` re-seed all leave
 * `selectedIds` alone, and the strip states how many of the selection the
 * current filter is hiding — with the count itself as the control that clears
 * the filter and brings them back.
 *
 * ── COLOUR IS NEVER THE ONLY CUE. THIS IS NOT OPTIONAL ───────────────────
 * `index.css:358-367` records a standing accessibility WARN: `--valve-error`
 * against `--valve-open` is dE 7.6 under deuteranopia, legal ONLY WITH
 * SECONDARY ENCODING. Under `contrast` it is worse in a second way —
 * `--valve-open` is `oklch(0.85 0.25 140)` and `--valve-closed`
 * `oklch(0.85 0.25 110)`: same lightness, same chroma, 30 degrees apart, i.e.
 * two greens. THE SECONDARY ENCODING IS THE WORD, and `<ValveStateReadout>`
 * has no prop and no variant that removes it — see that file's header for why
 * the `<ValveStatus>` glyph was dropped rather than recoloured (it was
 * CONTRADICTING the swatch: blue glyph for Open beside a green swatch, and the
 * error glyph was the `--destructive` red `index.css:376-381` explicitly
 * rejected for this palette).
 *
 * ── A `Switch` IS THE WRONG CONTROL AND DOES NOT APPEAR ──────────────────
 * NN/g: a toggle "should take immediate effect", and where immediate results
 * are not feasible "use radio buttons or a single checkbox instead". A valve
 * command is slow, physical and failable — this app records a command and
 * never hears back from the hardware. So: checkboxes to build a set, then one
 * explicit, confirmed, counted action over it.
 *
 * ── CHROME: BACK, NOT X ──────────────────────────────────────────────────
 * The owner's standing rule: "x and back can't live in parallel, only one
 * exists. It needs to be back. If back is an option, and x if not." This
 * screen is PUSHED from the overview, so it gets back — in `AppHeaderBar`,
 * the app's one bar, the same chrome `SystemPageV2Screen.jsx` draws for a
 * pushed screen. The DRAWER'S DOOR IS NOT THE TITLE: since 2026-11-04 this
 * screen passes `onOpenNav`, which makes the title an inert readout and puts
 * the drawer behind the 40x40 `PanelLeft` button — see the call site.
 *
 * ── THE FLOATING PILL COVERS THE BOTTOM 93px, AND THE STRIP IS DOWN THERE ─
 * `TabBar`'s host reserves no column at all (`relative shrink-0 h-0`), so the
 * page column runs to the frame's bottom edge and the pill floats over its
 * last 93px. A scroll body pays for that with bottom padding; THIS screen
 * also has a bottom-pinned control — the selection strip, with the two
 * commit buttons in it — which is a different element and was missed in that
 * pass. It shipped unreachable. Both are now handled, and between them the
 * cost is zero rows: see the scroller and the strip for the measurements.
 *
 * ── REPAINT AFTER A WRITE — ALL THREE, FOR THREE REASONS ─────────────────
 * `pushBridge.publish` (`pushBridge.js:130`) POSTs to ntfy.sh over HTTP and
 * never touches the local channel: it is the cross-DEVICE relay. The same-tab
 * wake is `channel.postMessage` on `BroadcastChannel('pulse2-push')`
 * (precedent `pushSimFire.js:50-53`, consumed at `UserContext.jsx:47`), and a
 * BroadcastChannel does NOT receive its own messages
 * (`PushNotifications.jsx:102`), so a local state bump is required as well.
 *
 * ── APP-SHELL CONTRACT (`scripts/check-shell-contract.mjs`) ──────────────
 * Root is `flex:1 / minHeight:0 / column`; the ROW LIST is the single
 * `flex:1 / overflowY:auto / minHeight:0` element; header, chip row and the
 * selection strip are `shrink-0` siblings; `TabBar` is mounted; the drawer is
 * wired. No viewport-height class — `Phone.jsx` is a fixed frame and 100vh is
 * simply clipped. No negative horizontal margins, so there is nothing for the
 * `bleed-needs-a-bleeding-scroller` rule to catch. NO PORTAL AND NOTHING
 * `fixed`: `Select`, `DropdownMenu`, `Popover` and Radix `Dialog` all portal
 * to `document.body` and would escape Phone.jsx's 393x852 `overflow:hidden`
 * frame, so both sheets here are `absolute inset-0` inside the page.
 */
import { Fragment, useCallback, useId, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DropletOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import TabBar from '@/components/TabBar'
/* THE PILL'S FOOTPRINT, AS A NUMBER THIS FILE DOES NOT GET TO PICK.
   `TAB_BAR_CLEARANCE` is 12 + 65 + 16 = 93: the inset the pill floats at, the
   pill's own height, and this app's 16px gutter. It is imported rather than
   written down because the SELECTION STRIP below is new ground - no other
   screen puts a bottom-pinned control under the floating bar, so there is no
   second site and no test holding a literal here honest. See the strip's own
   note for what it is used for and the scroller's for why THAT one is still
   spelled as a literal. */
import { TAB_BAR_CLEARANCE } from '@/components/tabBarMetrics'
/* THE header — one bar on every screen, 2026-11-04 (owner: "It always needs
   to be the same"). Replaces MobileHeaderBar, which is left on disk unused.
   This screen's `<h1>` is still the sr-only one below; the bar names the
   scope, exactly as the bar it replaced did. */
import AppHeaderBar from '@/v2/components/AppHeaderBar'
/* One key, `home.switch_location`, for the title slot's accessible name. */
import { useTranslation } from 'react-i18next'
import WintSidebarV2 from '@/v2/components/WintSidebarV2'
import BulkValveConfirmSheet from '@/v2/components/BulkValveConfirmSheet'
import FilterSheet, { FilterSheetTrigger } from '@/v2/components/FilterSheet'
import { countActiveFilters } from '@/v2/components/filterSheetModel'
import { ValveStateReadout, ValveSwatch } from '@/v2/components/ValveStateReadout'
import {
  VALVE_CATEGORIES,
  blockedReasonOf,
  canActuate,
  isReachable,
  isSelectable,
  summariseValves,
  targetsForSelection,
  valveCategoryOf,
} from '@/v2/components/valveScope'
import { effectiveValveState, recordBulkValveCommand } from '@/data/valveCommandStore'
import { formatLastSeen } from '@/utils/format'
import { publish } from '@/lib/pushBridge'
import { SYSTEMS } from '@/data/systems'
import { getAccountById } from '@/data/accounts'

/* The same-tab wake. Module-level — one channel per module, not one per
   render. Guarded because some environments do not have it, and a missing
   channel must not take the screen down: the local `tick` bump below is what
   actually repaints THIS page. */
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null

/* How many rows are DRAWN at once, and how many more each press adds. See the
   SCALE note in the header: this bounds the DOM, never the selection and never
   a count. 40 fills the 393x852 frame about four times over now that a row is
   44px rather than 61px. */
const PAGE_SIZE = 40

/* THE CHIP SCROLLER'S TRAILING ALPHA MASK IS GONE WITH THE CHIP ROW
   (2026-11-04). It existed because the state chips lived in an overflowing
   horizontal scroller on this row and the trailing one was being sliced in
   half; the chips are now inside the filter surface and nothing on the row
   overflows, so there is nothing left for a fade to soften. If a horizontal
   scroller ever returns to this screen, the constant is in git history at
   `CHIP_FADE_WIDTH` along with the three overflow affordances it belonged to.

   ── THE HOUSE CARD CHASSIS, ONE PER LOCATION ─────────────────────────────
   The canonical string is `ValveManagementCard.jsx`'s `CARD` constant and
   every token here is copied from it verbatim: `bg-surface-card`,
   `border border-solid border-card`, `rounded-[18px]`, `overflow-hidden`,
   `w-full`. The two things NOT copied are `items-start`, because that card's
   children are auto-width and these fill the card, and `content-stretch`,
   which is what `items-start` was cancelling. `shrink-0` matters here for a
   second reason: these sit in a flex COLUMN scroller, and without it a card
   would be squeezed rather than scrolled.

   `overflow-hidden` is load-bearing and is also why the group header is no
   longer sticky — see the 2026-11-03 note in the header. It is what clips the
   last row's `hover:bg-accent/50` fill to the 18px corner. */
const LOCATION_CARD =
  'flex w-full shrink-0 flex-col overflow-hidden rounded-[18px] border border-solid border-card bg-surface-card'

/* HAIRLINE RULES ARE INSET 16px so they stop short of the corner, which is the
   treatment the Home stack's own cards give their rules (measured 2026-11-03:
   the Water events card insets both its header rule and its row rules by 16px
   from the card edge).

   WHY A CHILD SELECTOR RATHER THAN A CLASS ON THE SEPARATOR: `separator.jsx`
   ships `data-[orientation=horizontal]:w-full`, specificity (0,2,0), which a
   plain `w-auto` on the element itself (0,1,0) cannot beat — it would lose and
   the rule would render 100% wide WITH a 16px margin, i.e. inset on the left
   and clipped flush on the right. Written as a descendant selector on the card
   it is (0,3,0) and wins outright, and the flex column's default `stretch`
   supplies the remaining width. One declaration covers the header rule and
   every row rule. */
const INSET_RULES =
  '[&_[data-slot=item-separator]]:mx-4 [&_[data-slot=item-separator]]:w-auto'

const CATEGORY_KEYS = VALVE_CATEGORIES.map((c) => c.key)

/* Singular / plural without a formatter — there is no i18n on this surface and
   `Intl.PluralRules` for two English forms is ceremony. Same call as
   `ValveManagementCard.jsx:318`. */
const plural = (n, one, many) => (n === 1 ? one : many)

/* THOUSANDS SEPARATOR IS A COMMA (`docs/wint-format-standards.md`, binding
   project-wide). Four-digit counts are not hypothetical on THIS screen: the
   owner's own framing for the feature is "shut off valve for around 1000 valve
   or 100 valves", and a bare `1000` on the one control in this app that cuts
   water to occupied buildings is exactly the number a reader mis-sizes at a
   glance. Every count that REACHES THE SCREEN goes through this, `aria-label`s
   included — they are read aloud, so they are UI copy.
   `en-US` is pinned rather than left to the runtime locale for two reasons:
   this surface has no i18n at all (see the header), and a locale-dependent
   separator would make the DOM tests depend on the machine they run on. */
const num = (n) => Number(n).toLocaleString('en-US')

// ── Scope resolution ───────────────────────────────────────────────────────
/* THE SAME PREDICATES `HomeAllAccounts.jsx:503-518` USES, in the same shape,
   so the two screens cannot disagree about what a scope contains. Copied
   rather than imported because `HomeAllAccounts` does not export them and is
   another agent's file this change may not touch; if either is ever exported,
   both call sites should take it from there. */

/** All three location levels, not only l4. `buildTree.js` documents l3 as the
 *  level the MRG export leaves unused, and a dataset that populates it should
 *  scope on it rather than silently miss. */
function matchesLocationName(s, name) {
  return s.l4Name === name || s.l3Name === name || s.l2Name === name || s.l1Name === name
}

/** Accounts are routable by name too: `s.account` is a Salesforce id and
 *  `getAccountById` resolves the name beside it. A parent account rolls its
 *  children up. */
function matchesAccountName(s, name) {
  const acct = getAccountById(s.account)
  if (!acct) return false
  if (acct.name === name) return true
  return getAccountById(acct.parentId)?.name === name
}

/** The leaf location a system sits in — what the location filter offers and
 *  what the row list GROUPS BY. */
function leafLocationOf(system) {
  return system?.l4Name || system?.l3Name || system?.l2Name || system?.l1Name || 'Unassigned'
}

/** THE CONTEXT OF A SYSTEM, which the owner asked for by name: "We need to
 *  understand the context of systems." A row that is only a name is not enough
 *  to decide whether to cut its water — so the location path is on screen for
 *  every row, ONCE, in the sticky header above the run of rows it describes,
 *  and in full in each row's own accessible name. */
function locationPathOf(system) {
  const parts = [system?.l4Name, system?.l3Name, system?.l2Name, system?.l1Name].filter(Boolean)
  return parts.slice(0, 2).join(' · ')
}

// ── Filtering ──────────────────────────────────────────────────────────────
/* An EMPTY array means "no constraint", which is `SystemsFilterSheet`'s own
   semantics — a group with nothing ticked matches everything rather than
   nothing.

   ALL THREE KEYS ARE SHEET GROUPS AGAIN (2026-11-04), AND THEIR NAMES ARE THE
   GROUP IDS. `state` left the sheet on 2026-11-02 when it became the chip row
   - at that point the four category words were being drawn three times before
   the user reached a row, and the sheet's group was the third drawing. The
   summary card went, then the chip row went, so there is one drawing left and
   it is back in the sheet. The shape never changed, which is why `?state=`
   and `matchesFilter` needed no edit either time.
   A MULTI-STATE FILTER IS BUILDABLE AGAIN, and `matchesFilter` already
   supported it: `filter.state` has always been read as a set. */
const EMPTY_FILTER = { location: [], state: [], connectivity: [] }

const CONNECTIVITY_OPTIONS = [
  /* NEW COPY: "Online". "Offline" is the product's own word
     (`en.json:348-355`); "Unreachable" is never used in this product. */
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
]

const connectivityOf = (s) => (isReachable(s) ? 'online' : 'offline')

function matchesFilter(system, filter) {
  if (filter.location.length > 0 && !filter.location.includes(leafLocationOf(system))) return false
  if (filter.state.length > 0 && !filter.state.includes(valveCategoryOf(system))) return false
  if (filter.connectivity.length > 0 && !filter.connectivity.includes(connectivityOf(system))) {
    return false
  }
  return true
}

/** THE ACTIVE FILTERS, AS THE WORDS THE USER PICKED, across EVERY axis.
 *
 *  This used to be `sheetFilterCount` and it deliberately left the state filter
 *  out, because the state filter was a chip on the row with its own visible
 *  pressed state and counting it would have said "1 active" about a control the
 *  user could already see was on. Since 2026-11-04 there is no such chip: every
 *  axis is behind the one door, so every axis counts here.
 *
 *  LABELS, NOT A BARE NUMBER, because the one control left on the row has to
 *  answer "filtered by what?" without being opened. The words are the ones the
 *  user chose from - `VALVE_CATEGORIES`' own state words, the location's own
 *  name, `CONNECTIVITY_OPTIONS`' own label - never a paraphrase. */
function activeFilterLabels(filter) {
  const labels = []
  for (const key of filter.state) {
    labels.push(VALVE_CATEGORIES.find((c) => c.key === key)?.label ?? key)
  }
  for (const name of filter.location) labels.push(name)
  for (const value of filter.connectivity) {
    labels.push(CONNECTIVITY_OPTIONS.find((o) => o.value === value)?.label ?? value)
  }
  return labels
}

/** `?state=` → the state filter's value. Only the four `VALVE_CATEGORIES`
 *  keys are honoured; anything else is All. See the deep-link note in the
 *  header for why an unknown value must not render an empty list. */
function stateFromSearch(search) {
  const raw = new URLSearchParams(search || '').get('state')
  return raw && CATEGORY_KEYS.includes(raw) ? [raw] : []
}

/** Options for one filter group, each WITH THE NUMBER OF SYSTEMS IT WOULD
 *  YIELD. `SystemsFilterSheet.jsx:245-247` states why in as many words — "A
 *  checkbox that silently returns nothing is the complaint this whole tab
 *  started from". Counts are scope-wide and independent of the other groups,
 *  exactly as `filterOptions(systems, categoryId)` computes them there, so a
 *  count never moves under the user while they are ticking. */
function optionsWithCounts(systems, keyOf, labelOf, order) {
  const counts = new Map()
  for (const s of systems) {
    const key = keyOf(s)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const keys = order
    ? order.filter((k) => counts.has(k))
    : [...counts.keys()].sort((a, b) => String(a).localeCompare(String(b)))
  return keys.map((value) => {
    const label = labelOf(value)
    const count = counts.get(value) || 0
    return {
      value,
      label,
      count,
      /* THE CHECKBOX'S ACCESSIBLE NAME, unchanged from the sheet this screen
         used to own. `FilterSheet` names an option from the row's own
         `<label>` when no `name` is given, which would read the bare count
         beside the word; this says it in the screen's own units instead. */
      name: `${label}, ${num(count)} ${plural(count, 'system', 'systems')}`,
    }
  })
}

/** The drawn rows, in runs by location, each run keeping its first-appearance
 *  position. Grouping is what lets the row drop its second line (see point 4
 *  in the header), and it is done on `shown` — the PAGE — never on `filtered`,
 *  so which 40 systems are drawn is decided before grouping and paging cannot
 *  interact with it. First-appearance order rather than alphabetical because
 *  `SYSTEMS` arrives in tree order from `buildTree`, which is the order every
 *  other surface in this app lists locations in; a system that turns up out of
 *  run still lands in its own group rather than opening a second one. */
function groupByLocation(systems) {
  const byLocation = new Map()
  for (const system of systems) {
    const key = leafLocationOf(system)
    if (!byLocation.has(key)) {
      byLocation.set(key, { key, path: locationPathOf(system) || key, systems: [] })
    }
    byLocation.get(key).systems.push(system)
  }
  return [...byLocation.values()]
}

// ── One system row ─────────────────────────────────────────────────────────
/* `<Item size="sm">` — the shadcn list row, `gap-2.5 px-4 py-3`. One line:

     [ box ]  Name ......................  ● Open

   and for an OFFLINE system a second, because those two facts are genuinely
   per-row and nothing above the row can carry them:

     [ box ]  Name ......................  ● Last known: Open
              Offline · Last seen 26h ago

   THE WHOLE ROW IS THE TARGET, not the 18px box, and `min-h-11` puts the floor
   at 44px. The row's press handler defers to the `<Checkbox>` when the press
   landed on it — the same `closest()` guard `SystemPageV2Screen.jsx:1461-1464`
   uses so a card can be tappable without stealing its own controls' clicks.
   There is deliberately no chevron: a `>` promises a drill-down, and pressing
   this row ticks a box.

   THE STATE IS ALWAYS DRAWN, AND IT IS ALWAYS THE VALVE'S. The old row put the
   valve badge and the Offline badge in ONE slot, so an offline row showed no
   valve state at all and the "Open" filter produced rows badged "Offline".
   `<ValveStateReadout system={...}>` resolves both dimensions from one
   `valveReadingOf()` call — the same answer the counts and the confirm sheet
   get — and says `Last known: Open` where the certainty is `last-known`.

   AN OFFLINE ROW STAYS SELECTABLE. The user may legitimately want it in the
   set; what must never happen is the user BELIEVING it will be commanded, and
   that is carried by the word, by the ink step, by the strip's exclusion
   clause and by the confirm sheet naming it. */
function SystemRow({ system, checked, onToggle }) {
  const selectable = isSelectable(system)
  const reachable = isReachable(system)
  const actionable = canActuate(system)
  const path = locationPathOf(system)
  const name = system.name || system.title || system.id

  /* NEW COPY: "Last seen ". `formatLastSeen` returns 'Unknown' for a missing
     timestamp and "Last seen Unknown" is worse than the bare word, so that
     case falls back to "Offline" alone. */
  const lastSeen = system.lastSeen ? `Last seen ${formatLastSeen(system.lastSeen)}` : null
  /* NEW COPY. "Offline" is the product's own word (`en.json:350`). This line
     is the CONNECTIVITY dimension in full: the word and the age, no colour and
     no second dot. */
  const offlineNote = reachable ? null : [`Offline`, lastSeen].filter(Boolean).join(' · ')

  /* NEW COPY, both branches. The reason rides in the accessible NAME, because
     the name is the only thing a screen-reader user gets before deciding
     whether to press — AND because the location path is no longer drawn on the
     row itself. A sighted user reads it off the sticky header above the run;
     someone tabbing between checkboxes never sees that header, so the path is
     spelled here for them. On a selectable row the trailing clause names the
     thing the button's number is about to be smaller because of. */
  const context = [path, offlineNote].filter(Boolean).join(' · ')
  const label = selectable
    ? `${name}, ${context}. ${
        actionable
          ? ''
          : reachable
            ? 'Excluded from bulk actions.'
            : 'System is offline - excluded from bulk actions, last-known state shown.'
      }`.trim()
    : `${name}, ${path}. No valve installed - not selectable, there is no valve here to command.`

  const press = (e) => {
    if (!selectable) return
    /* The box handles its own press; without this guard a click on it would
       toggle twice and land back where it started. */
    if (e.target?.closest?.('[data-slot="checkbox"]')) return
    onToggle()
  }

  return (
    <Item
      size="sm"
      role="listitem"
      data-valve-row={system.id}
      data-selectable={selectable ? 'true' : 'false'}
      data-reachable={reachable ? 'true' : 'false'}
      onClick={press}
      className={cn(
        /* `rounded-none` because these rows are a continuous list separated by
           rules, not a stack of cards; the primitive's `rounded-md` is for a
           standalone Item. The focus ring is the primitive's and is kept. */
        'min-h-11 w-full rounded-none',
        selectable ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
      )}
    >
      <Checkbox
        /* `aria-disabled`, NOT the `disabled` attribute, on a no-valve row.
           A disabled control is skipped outright by some assistive tech, so
           the user never learns WHY it cannot be used — which on this row is
           the single most useful thing it has to say. It stays focusable and
           announced; being controlled at `false` with no change handler is
           what makes it inert. */
        checked={selectable ? checked : false}
        onCheckedChange={selectable ? onToggle : undefined}
        aria-disabled={selectable ? undefined : 'true'}
        aria-label={label}
        className="shrink-0"
      />

      {/* `min-w-0` so a long system name truncates instead of pushing the
          state readout onto a second line — `Item` is `flex-wrap`, and a
          `flex-1` child that cannot shrink below its content is what makes a
          wrapping row. */}
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle
          className={cn(
            'w-full min-w-0',
            /* THE INK STEP IS THE CONNECTIVITY CUE (Bertin: lightness is
               dissociative — a dimmed row visually leaves the group, which is
               exactly "not in the actionable set"). A TOKEN step rather than
               an `opacity-*` so it stays above 4.5:1 in all four themes; see
               the header. A no-valve row takes the same step for the same
               reason — it is not in the actionable set either. */
            selectable && reachable ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="truncate">{name}</span>
        </ItemTitle>
        {offlineNote ? (
          <ItemDescription className="text-xs">{offlineNote}</ItemDescription>
        ) : null}
      </ItemContent>

      {/* NO `self-start`. It top-aligned the readout against a centre-aligned
          checkbox and title, so the three columns did not share a baseline —
          measured 2026-11-03 at 1.63px of rise, enough to read as a wobble
          down a 45px-row list. `ItemActions` is `flex items-center`, so the
          flex default (`stretch`) plus that inner centring lands the state
          word on the row's own centre line. */}
      <ItemActions className="min-w-0">
        <ValveStateReadout
          system={system}
          className={cn('text-xs', reachable ? 'text-foreground' : 'text-muted-foreground')}
        />
      </ItemActions>
    </Item>
  )
}

/* ── THE FILTER SURFACE IS NOT THIS FILE'S ANY MORE ───────────────────────
   The owner, 2026-11-04, on this screen: "I want to hide everything under
   filters. I had it some of them are filters and some of them are not. Use the
   shadcn filters, don't invent something that looks from different app. Make
   search for locations, all the rest doesn't need any search. Make it easy to
   use." And on /alerts the same day: "Use only shadcn component again."

   TWO SCREENS GOT THE SAME INSTRUCTION ON THE SAME DAY, so there is ONE
   surface: `src/v2/components/FilterSheet.jsx`, with `FilterSheetTrigger` as
   the control that opens it and `filterSheetModel.js` for the count. A local
   `ValveFilterSheet` lived here until this pass and is deleted - two sheets
   that look alike but are separate code is precisely what "don't invent
   something that looks from different app" rules out, and a divergence between
   them would be invisible until a token moved under one and not the other.

   WHAT MOVED OUT OF THIS FILE WITH IT: the draft/apply contract, the scrim,
   the Escape key, the `absolute inset-0` shell, the group headers, the
   checkbox rows, the footer. WHAT THE SHARED COMPONENT GAINED so it could
   carry this screen, all opt-in per group and all off by default so /alerts
   did not move: `searchable` + `searchLabel` + `searchEmptyLabel`, `selectAll`
   (the tri-state `All N` box this screen already had), a per-option `count`
   Badge, a per-option `name` for the checkbox's accessible name, `emptyLabel`,
   and `summary` + `dataName` on the trigger. See that file's contract.

   WHAT THE STATE CHIPS BECAME, AND WHY IT IS A REAL CHANGE. They were a
   `<ToggleGroup type="single">` on the page: `All 103` · `Valve Error 2` ·
   `Open 74` · `Closed 7` · `No valve installed 20`, in a scroller measured on
   2026-11-04 at 643px inside a ~268px slot, which is the sliced chip in the
   owner's screenshot. They are now a `multi` group IN the surface, drawn as
   checkbox rows like the other two axes.
     · NOT the shared sheet's `single` mode, which is a segmented control one
       flex-1 segment per option. Five options at 361px is 64px each and
       `No valve installed` ellipses to nothing - the exact defect that sheet
       was built to fix on /alerts, where four chips already ellipsed.
     · SO THE STATE FILTER IS NOW MULTI-SELECT, which is an ADDITION: `Open`
       plus `Closed` in one pass was impossible before. `matchesFilter` already
       read `filter.state` as a set and needed no change, and `?state=` still
       seeds exactly one key.
     · THE ONE READOUT GIVEN UP IS `All 103`, the scope total that rode on the
       All chip. The four counts beside the four states still sum to it - that
       is why the `none` chip was kept in the first place, "a breakdown missing
       a part is a lie about the whole" - so the number is derivable and every
       part is on screen. Flagged to the owner rather than quietly dropped.
     · THE SWATCH SURVIVES, beside the word, in every row. `index.css:358-367`
       records --valve-error against --valve-open at dE 7.6 under deuteranopia,
       legal ONLY with secondary encoding, and the word is that encoding. */

// ── Screen ─────────────────────────────────────────────────────────────────

export default function ValveManagementScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  /* `key === 'default'` is react-router's marker for the FIRST entry in the
     history stack, in BrowserRouter and MemoryRouter alike. It is how this
     screen knows whether there is a "where the user came from" to go back to;
     when there is not, back goes to the scope's own overview rather than being
     a control that does nothing. */
  const { key: historyKey, search } = useLocation()
  const { locationName } = useParams()

  const scopeName = locationName ? decodeURIComponent(locationName) : null
  /* "All Accounts" is HomeAllAccounts' own unscoped title, reused so the two
     screens name the fleet the same way. */
  const scopeLabel = scopeName ?? 'All Accounts'

  /* `useId`, not literals, because a literal id is a duplicate waiting for a
     second mount. `selectAllNoteId` is what the select-all box points
     `aria-describedby` at, so a screen reader gets the same accounting the
     sighted user does. The per-chip count ids went with the chips
     (2026-11-04): a state option's count now rides in its own `aria-label`,
     which `FilterSheet` takes from that option's `name`. */
  const selectAllNoteId = useId()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filter, setFilter] = useState(() => ({ ...EMPTY_FILTER, state: stateFromSearch(search) }))
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [renderLimit, setRenderLimit] = useState(PAGE_SIZE)
  const [pending, setPending] = useState(null)
  const [result, setResult] = useState(null)
  const [tick, setTick] = useState(0)

  /* `?state=` RE-SEEDS THE STATE GROUP AND LEAVES THE SELECTION ALONE. Seeded
     in the initialiser above for the first render, and re-seeded here when the
     query string changes under a mounted screen — arriving from a second link
     on the same route does not unmount, so an initialiser alone would leave
     the old filter in force. Done during render rather than in an effect,
     which is React's own derive-from-props pattern and avoids a frame of the
     stale list. Only the `state` group is touched: a location or connectivity
     choice the user made by hand is theirs, not the link's. */
  const [seededSearch, setSeededSearch] = useState(search)
  if (seededSearch !== search) {
    setSeededSearch(search)
    setFilter((prev) => ({ ...prev, state: stateFromSearch(search) }))
    setRenderLimit(PAGE_SIZE)
  }

  /* THE ROUTE IS THE SCOPE, resolved by NAME exactly as
     `HomeAllAccounts.jsx:516-543` resolves it. A NAME THAT MATCHES NOTHING
     YIELDS AN EMPTY SCOPE, NOT THE FLEET (`:545-549`) — falling back to the
     fleet is what produced a shipped bug there: fleet numbers under a
     location's name, which reads as truth and is not. */
  const scopedSystems = useMemo(() => {
    const all = SYSTEMS ?? []
    if (!scopeName) return all
    return all.filter((s) => matchesLocationName(s, scopeName) || matchesAccountName(s, scopeName))
  }, [scopeName])

  /* Commanded state wins over the system's own `valve`, resolved HERE because
     this screen is what wrote the commands and so is what must read back
     correctly after one. `valveScope.js:21-25` says a caller wanting commanded
     state honoured resolves it FIRST and hands the resolved systems in; this is
     that call site. `SYSTEMS` is never mutated — every entry is a fresh object.
     `tick` is in the deps so a write re-resolves, and is read for no other
     reason. */
  const systems = useMemo(() => {
    void tick
    return scopedSystems
      .filter((s) => !!s && typeof s === 'object')
      .map((s) => ({ ...s, valve: effectiveValveState(s) }))
  }, [scopedSystems, tick])

  const summary = useMemo(() => summariseValves(systems), [systems])

  const filtered = useMemo(() => systems.filter((s) => matchesFilter(s, filter)), [systems, filter])
  const selectableFiltered = useMemo(() => filtered.filter(isSelectable), [filtered])
  /* THE GAP BETWEEN THE TWO NUMBERS, DERIVED RATHER THAN DRAWN TWICE. The bar
     used to print "Select all 3 matching" beside a badge reading "5 rows":
     two numbers with different meanings, adjacent, on the one control that
     acts in bulk, and nothing on the bar said which was which. The badge is
     gone — the rows are on screen, so it restated what the eye already had —
     and the 2 it was silently hiding is now a sentence that says what those
     rows are and why they are not in the count. */
  const unselectableFiltered = filtered.length - selectableFiltered.length
  const shown = useMemo(() => filtered.slice(0, renderLimit), [filtered, renderLimit])
  const rowGroups = useMemo(() => groupByLocation(shown), [shown])

  /* ── THE THREE AXES, AS ONE DECLARATIVE ARRAY FOR `<FilterSheet>` ───────
     The group ids ARE the keys of `filter`, so the map the sheet hands back on
     Apply is the filter. Nothing translates between them and there is nothing
     to keep in sync.

     SHORT GROUPS FIRST, THE LONG ONE LAST. State and Connectivity are 4 and 2
     options; Location is 17 here and unbounded in production. Measured in a
     393x852 frame on 2026-11-04: with Location second, the Connectivity header
     sat below the fold on first open - a two-option filter nobody would scroll
     to find. Location is the one that can afford to be last because it is the
     one with a search box over it.

     EVERY OPTION CARRIES ITS COUNT. `SystemsFilterSheet.jsx:245-247` states
     why in as many words: "A checkbox that silently returns nothing is the
     complaint this whole tab started from." Counts are scope-wide and
     independent of the other groups, so a count never moves under the user
     while they are ticking. */
  const groups = useMemo(
    () => [
      {
        id: 'state',
        /* NEW COPY: all three group names. The OPTION labels below are not
           new: the four valve words are `VALVE_CATEGORIES`', verbatim from
           Figma board 199535:96542, and the two connectivity words are the
           product's own (`en.json:348-355`). */
        label: 'Valve state',
        mode: 'multi',
        /* THE CATEGORIES PRESENT IN THIS SCOPE, and no others. An option for a
           state with no systems is a control that can only ever return an
           empty list. */
        options: VALVE_CATEGORIES.filter((c) => summary.byCategory[c.key].total > 0).map((c) => {
          const count = summary.byCategory[c.key].total
          return {
            value: c.key,
            /* A NODE, not a string: the swatch travels with the word. The word
               is the secondary encoding the dE 7.6 note in the header makes
               mandatory, and the swatch is what makes the option scannable. */
            label: (
              <>
                <ValveSwatch categoryKey={c.key} />
                {c.label}
              </>
            ),
            count,
            name: `${c.label}, ${num(count)} ${plural(count, 'system', 'systems')}`,
          }
        }),
      },
      {
        /* CONNECTIVITY IS THE AXIS THE WHOLE FEATURE TURNS ON, so it is a
           first-class filter and not an afterthought: "show me only the
           offline ones" is how a user audits what a bulk action will miss. */
        id: 'connectivity',
        label: 'Connectivity',
        mode: 'multi',
        selectAll: true,
        options: optionsWithCounts(
          systems,
          connectivityOf,
          (v) => CONNECTIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v,
          CONNECTIVITY_OPTIONS.map((o) => o.value),
        ),
      },
      {
        id: 'location',
        label: 'Location',
        mode: 'multi',
        selectAll: true,
        /* THE ONE SEARCHABLE AXIS. The owner: "Make search for locations, all
           the rest doesn't need any search." 17 leaf locations in this
           dataset, unbounded in production - and the only list here a thumb
           cannot scan. Valve state has 4 options and connectivity 2, both
           fully drawn: a box over either would be a control with nothing to
           do. There is no global search on this screen and none is added. */
        searchable: true,
        /* NEW COPY, all three. */
        searchLabel: 'Search locations',
        searchEmptyLabel: 'No locations match this search.',
        emptyLabel: 'Nothing to filter by here.',
        options: optionsWithCounts(systems, leafLocationOf, (v) => v),
      },
    ],
    [summary, systems],
  )

  const closeTargets = useMemo(
    () => targetsForSelection(systems, selectedIds, 'close'),
    [systems, selectedIds],
  )
  const openTargets = useMemo(
    () => targetsForSelection(systems, selectedIds, 'open'),
    [systems, selectedIds],
  )
  const pendingTargets = pending ? (pending.action === 'close' ? closeTargets : openTargets) : null

  const selectedCount = closeTargets.selected.length
  const hiddenSelected = selectedCount - filtered.filter((s) => selectedIds.has(s.id)).length

  /* The exclusions that hold WHATEVER the action is — offline, no valve,
     Valve Error, closing. `alreadyInState` is action-dependent and is carried
     by the difference between the two button numbers and by the sheet. */
  const blockedSelected = closeTargets.selected.filter((s) => !canActuate(s))

  /* THE LABEL THE BATCH RECORD GETS — AND ONLY THE BATCH RECORD.
     This screen used to hand this richer string to the sheet as well, because
     the sheet's second line could only say "Every system at this location" /
     "Every system in this account" and NEITHER is true of a selection. That
     workaround is gone: the sheet now has a 'selection' kind and states the
     fact itself, in the sentence whose job it is, so the sheet gets the plain
     scope name back and the two numbers stop competing on one line.

     THE RECORD KEEPS THE RICH LABEL, which is the one place it was always
     more honest than a bare scope name. `recordBulkValveCommand` writes a
     durable row read later with no screen around it; "320 Summit Blvd" alone
     would say the batch covered the location, and it did not. This string
     says what it covered. */
  const batchScopeLabel = `${scopeLabel} · ${num(selectedCount)} of ${num(summary.total)} ${plural(summary.total, 'system', 'systems')} selected`

  const toggle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allMatchingSelected =
    selectableFiltered.length > 0 && selectableFiltered.every((s) => selectedIds.has(s.id))
  const someMatchingSelected = selectableFiltered.some((s) => selectedIds.has(s.id))

  /* SELECT-ALL MATERIALISES IDS AT CLICK TIME. The selection is a `Set` of
     stable ids and never a predicate: a predicate re-evaluated at submit time
     is how a bulk tool silently acts on rows the user never saw. */
  const toggleAllMatching = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const all = selectableFiltered.length > 0 && selectableFiltered.every((s) => next.has(s.id))
      for (const s of selectableFiltered) {
        if (all) next.delete(s.id)
        else next.add(s.id)
      }
      return next
    })
  }, [selectableFiltered])

  /* ── SELECT-ALL AT TWO SCOPES ──────────────────────────────────────────
     The owner, 2026-11-03: "I want select all for the entire for all systems,
     and select all per location." The strip above is the FLEET one and is
     unchanged; this is the per-LOCATION one, and it lands in the card header
     the same pass introduced, which is the only place on this screen that is
     unambiguously about one location.

     IT IS BUILT FROM `selectableFiltered`, NOT FROM `shown` — THIS IS THE
     WHOLE DESIGN DECISION AND IT IS DELIBERATE:

     · IT RESPECTS THE FILTER. The source is already filtered, so a location
       box can never reach a row the current filter is hiding. Same rule the
       fleet strip follows, for the same reason: a bulk control that acts on
       rows the user cannot see is the footgun this screen exists to close.
     · IT IGNORES `isSelectable === false`. A "No valve installed" system is
       never in this list, so a location's number can never promise a command
       that cannot be issued.
     · IT COVERS ROWS BELOW THE `PAGE_SIZE` CUT. `rowGroups` is built from the
       PAGE, so the last drawn card can be a partial view of its location —
       but the box reaches that location's whole matching set, exactly as
       "Select all N matching" reaches past the page. The alternative, a box
       that silently stops at the fold, would mean two select-alls on one
       screen with two different and invisible reaches. THE COUNT ON SCREEN IS
       THAT REACH: the badge in each header is this number, not the number of
       rows drawn beneath it, so a truncated card visibly shows a badge larger
       than its own row count and the pagination line below spells out why.
     · IT IS STILL A SET OF STABLE IDS MATERIALISED AT CLICK TIME, never a
       predicate — see the header. */
  const selectableByLocation = useMemo(() => {
    const byLocation = new Map()
    for (const s of selectableFiltered) {
      const key = leafLocationOf(s)
      const list = byLocation.get(key)
      if (list) list.push(s)
      else byLocation.set(key, [s])
    }
    return byLocation
  }, [selectableFiltered])

  const toggleLocation = useCallback(
    (locationKey) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        const list = selectableByLocation.get(locationKey) ?? []
        const all = list.length > 0 && list.every((s) => next.has(s.id))
        for (const s of list) {
          if (all) next.delete(s.id)
          else next.add(s.id)
        }
        return next
      })
    },
    [selectableByLocation],
  )

  const applyFilter = useCallback((next) => {
    setFilter(next)
    setFilterOpen(false)
    /* A new filter is a new list; keeping a raised cap because the previous
       list was long would defeat the bound. NOTE WHAT IS *NOT* HERE: the
       selection. Filtering never deselects. */
    setRenderLimit(PAGE_SIZE)
  }, [])

  /* `setStateChip` IS GONE (2026-11-04) and nothing replaced it. The state
     filter was the one axis applied straight from the page, outside the
     draft/apply contract every other axis obeys; it now travels in the sheet's
     draft like the rest and lands through `applyFilter`. The `?state=` re-seed
     above still writes `filter.state` directly, because a deep link is not a
     draft - it IS the applied filter, the same way it always was. */

  /* The control behind "N hidden by the filter" on the strip. Clears
     EVERYTHING, including the chip — the user pressed a number that counts
     selected systems the current filter is hiding, and the only honest
     response is to show all of them. */
  const clearFilters = useCallback(() => {
    setFilter(EMPTY_FILTER)
    setRenderLimit(PAGE_SIZE)
  }, [])

  const goBack = useCallback(() => {
    if (historyKey && historyKey !== 'default') {
      navigate(-1)
      return
    }
    navigate(scopeName ? `/location/${encodeURIComponent(scopeName)}` : '/')
  }, [historyKey, navigate, scopeName])

  const commit = useCallback(() => {
    if (!pending || !pendingTargets) return
    const { action } = pending
    const { willAct, skipped, selected } = pendingTargets

    const batch = recordBulkValveCommand({
      action,
      systemIds: willAct.map((s) => s.id),
      /* The store wants IDS; `targetsForSelection` hands back SYSTEMS, because
         the confirm sheet lists the offline ones BY NAME and an id would have
         nothing to print. One mapping, here, at the single call site. */
      skipped: Object.fromEntries(
        Object.entries(skipped).map(([bucket, list]) => [bucket, list.map((s) => s.id)]),
      ),
      scopeLabel: batchScopeLabel,
    })

    /* A persistent, addressable record — NOT a toast. */
    setResult({
      action,
      recorded: batch !== null,
      commanded: willAct.length,
      attemptedOver: selected.length,
      buckets: Object.entries(skipped)
        .filter(([, list]) => list.length > 0)
        .map(([bucket, list]) => ({ bucket, count: list.length })),
    })
    setPending(null)
    setSelectedIds(new Set())

    /* Repaint — all three, for the three different reasons in the header. */
    setTick((n) => n + 1)
    try {
      channel?.postMessage({ type: 'data-changed' })
    } catch {
      /* no channel in this environment — the local bump above still stands */
    }
    publish({ type: 'data-changed' })
  }, [pending, pendingTargets, batchScopeLabel])

  /* WHAT THE ONE CONTROL ON THE ROW HAS TO SAY WITHOUT BEING OPENED: how many
     constraints are on, and - when there is exactly one - WHICH.
     THE NUMBER IS `countActiveFilters`, the shared model's, so this screen and
     /alerts cannot disagree about what "active" means. With three `multi`
     groups it is simply the number of ticked values.
     THE WORD is this screen's, because only this screen knows that `open` is
     drawn as `Open`. One label fits a 361px row and cannot clip; two would be
     a guess about which matters more, so past one the trigger states the count
     and the surface states the rest. NEW COPY: the `N filters` form only - the
     single-filter form is always a word the user already chose from a
     catalogue, never a phrase authored here.
     DELIBERATELY NOT THE WORD "selected": this screen counts a SELECTION of
     systems a few lines below, and two different things called "3 selected" on
     one screen is the number confusion copy standard §4 exists to stop. */
  const activeFilters = countActiveFilters(groups, filter)
  const filterSummary =
    activeFilters === 0
      ? undefined
      : activeFilters === 1
        ? activeFilterLabels(filter)[0]
        : `${num(activeFilters)} ${plural(activeFilters, 'filter', 'filters')}`
  const hasValves = summary.valveTotal > 0

  /* ── WHAT THE SELECTION STRIP SHOWS, AND THE `none` DEAD END ───────────
     THE DECISION ON "No valve installed", recorded because the brief asked
     for it in as many words.

     THE DEFECT: the chip row is built from every category with `total > 0`,
     which includes `none`. Tapping it used to yield a list where every row is
     unselectable, a select-all reading "Select all 0 matching" with a DISABLED
     checkbox, and a note saying "N of N rows shown can't be selected". A
     first-class filter to a state in which the screen can do nothing.

     THE CHIP STAYS. The chip row is now the part-to-whole readout as well as
     the filter (redesign point 1), and a breakdown missing a part is a lie
     about the whole: with 12 of 103 systems carrying no valve, chips summing
     to 91 invite the reader to take 91 as the fleet. "Which of my systems have
     no valve?" is also a real inventory question, and this is the only screen
     that can answer it. Removing the chip would delete a count and an answer
     to remove a symptom.

     THE DEAD END GOES INSTEAD, at the destination: WHEN NOTHING IN THE
     FILTERED SET CAN BE SELECTED, THE SELECT-ALL CONTROL IS NOT DRAWN. No
     disabled checkbox, no "Select all 0 matching", and no "N of N rows shown
     can't be selected" restating the filter the user just applied. In its
     place, one sentence that says what these rows are. This is defence in
     depth rather than a `none`-specific patch — a location filter, or
     connectivity plus state, can produce an all-unselectable list too, and
     before this change every one of those produced the same disabled control.

     THE STRIP STAYS MOUNTED WHEN A SELECTION EXISTS AND THE FILTER MATCHES
     NOTHING. That is the case naive implementations drop: filter to zero rows
     with 20 selected and the bulk bar unmounts, taking the only route to
     acting on them with it. The action half is keyed on `selectedCount`, which
     no filter touches. */
  const canSelectAll = selectableFiltered.length > 0
  const showSelectAll = hasValves && canSelectAll
  const showNoneSelectable = hasValves && !canSelectAll && filtered.length > 0
  /* THE ACTION HALF APPEARS ON THE FIRST SELECTION and never before it. A
     scope with zero valves therefore never shows one, which is the honest
     shape: there is no action to offer. */
  const showActions = hasValves && selectedCount > 0
  const showStrip = showSelectAll || showNoneSelectable || showActions

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-bg)',
        position: 'relative',
      }}
      data-name="valve-management-screen"
    >
      <div className="relative flex w-full flex-col gap-2 px-4 py-2" style={{ flex: 1, minHeight: 0 }}>
        {/* THE PAGE'S ONE <h1>, SR-ONLY. `AppHeaderBar` names the scope
            visually and the user arrived from a "Manage valves" button, so a
            second visible title was restatement — but the document still owes
            a heading, and a screen whose title has no heading role is a screen
            a rotor cannot find. */}
        <h1 className="sr-only">Valve management</h1>

        {/* FIXED CHROME — a shrink-0 sibling of the scroller, not a sticky
            child. BACK, not X: this screen is pushed from the overview.

            ── THE NAV CONTROL, ADOPTED HERE 2026-11-04 ────────────────────
            The owner, on a screenshot of /valves still drawing a back chevron
            and a `100 Meridian Plaza ⌄` pill: "I see that we still have the
            old version of header above in some places, so you need to make
            sure we don't use the same navigation on the header."

            WHAT WAS OLD ABOUT IT. This bar was already `AppHeaderBar`, so the
            component was right and the SHAPE was not: without `onOpenNav` the
            component draws its title slot as a bordered 44px `<button>` with a
            chevron-down and hangs `Switch location` on it — v1's ScopeHeader
            treatment, which the Dashboard and /system/:id left behind the same
            day. ⚠ PASSING `onOpenNav` IS WHAT MOVES THE DOOR: AppHeaderBar
            draws the title as a button only when no `onOpenNav` is given, so
            this one prop makes the title an inert readout (no chassis, no
            chevron, no handler, no role, no tabIndex) and puts the drawer
            behind a 40x40 lucide `PanelLeft` instead.

            STILL EXACTLY ONE DOOR. `scopeAriaLabel` follows it — AppHeaderBar
            spells `Switch location` on whichever of the two is live and never
            on both — so this route keeps the single element
            `drawerLocationHighlight.dom.test.jsx:66` opens the drawer by.
            Verified in the running app on /valves and /valves/:locationName,
            light and dark: one match, and it is the PanelLeft button.

            `onOpenDrawer` IS STILL PASSED, as it is on the other two surfaces:
            it is what the component hangs the door on in the OTHER shape and
            the two can never be live at once.

            THE BACK CONTROL STAYS. The leading slot and the trailing slot are
            different slots, and this screen is pushed from the overview — the
            owner's standing rule is "if back is an option" it is back.

            NO `onColor`. That prop is for a bar sitting on artwork; this one
            sits on `--app-bg`, so its ink stays the page-ground token. */}
        <div className="w-full shrink-0">
          <AppHeaderBar
            /* No px of its own; the root's inset is the inset. */
            className="px-0"
            label={scopeLabel}
            /* `Switch location`, from the catalogue — the name the drawer is
               opened BY everywhere in this app. */
            scopeAriaLabel={t('home.switch_location')}
            onBack={goBack}
            backLabel="Back"
            onOpenDrawer={() => setDrawerOpen(true)}
            onOpenNav={() => setDrawerOpen(true)}
          />
        </div>

        {/* ── ONE DOOR ───────────────────────────────────────────────────
            The owner, 2026-11-04: "I want to hide everything under filters. I
            had it some of them are filters and some of them are not."

            WHAT WAS HERE: a horizontal scroller of state chips with the Filters
            button pinned beside it. Two kinds of control on one row doing the
            same job by two different gestures, and the scroller OVERFLOWED -
            measured in a real 393x852 frame at 643px of chips in a ~268px slot
            on `/valves`, which is why his screenshot shows `Clos...` sliced.
            The three overflow affordances it carried (an alpha mask, matching
            trailing padding, proximity snap) were all treatment for a symptom
            of putting a growing list on a fixed row.

            WHAT IS HERE NOW: one full-width `<Button>` that opens the filter
            surface. Full width rather than the old auto width for three
            reasons - nothing can overflow a row with one item in it; the
            target is 361x32 instead of ~85x32 on the screen whose brief ends
            "make it easy to use"; and the slack is what carries the summary of
            what is currently on.

            THE SUMMARY IS SHADCN'S OWN FACETED-FILTER TRIGGER, not an invented
            look: `[icon] [label] [vertical Separator] [Badge]`, which is what
            `DataTableFacetedFilter` draws and which this row already used in
            miniature for its count badge. shadcn collapses the value badges to
            a bare count below `lg`; this keeps ONE badge because the common
            case here is exactly one filter - the `?state=` deep link - and a
            user who lands on two rows out of 103 needs to read WHY on the face
            of the screen.

            HEIGHT IS UNCHANGED, DELIBERATELY: `size="sm"` is h-8, which is what
            the chip scroller measured. This pass buys clarity, not rows; the
            rows were bought in the 2026-11-02 pass and are not given back. */}
        {hasValves ? (
          <div className="flex w-full shrink-0 items-center" data-name="valve-filter-row">
            {/* `FilterSheetTrigger` is the shared control, so this screen and
                /alerts open their filters with the same button. Two props are
                this screen's:
                  · `label="Filters"` keeps the string this screen already
                    shipped (copy rule 0 - do not reword a visible string);
                    the component's own default is "Filter by".
                  · `summary` names the one constraint when there is exactly
                    one, which is the `?state=open` deep-link case.
                FULL WIDTH, which the shared trigger allows and /alerts does
                not use: nothing can overflow a row with one item in it, and
                the target goes from ~85x32 to 361x32 on the screen whose
                brief ends "make it easy to use". The slack is what carries
                the summary. */}
            <FilterSheetTrigger
              label="Filters"
              count={activeFilters}
              summary={filterSummary}
              dataName="valve-filter-trigger"
              onClick={() => setFilterOpen(true)}
              className={cn(
                'w-full justify-start',
                activeFilters > 0 && 'border-primary text-primary',
              )}
            />
          </div>
        ) : null}

        {/* ── THE ONE SCROLLING REGION ────────────────────────────────────

            THE CLEARANCE IS ONLY OWED WHEN THIS IS THE BOTTOM-MOST ELEMENT.
            The pill covers the bottom 93px of the frame and every scroll body
            in the app pays for that — but on THIS screen the selection strip
            is mounted BELOW the scroller and is itself what clears the pill
            (see its own note). When the strip is there the scroller's bottom
            edge borders the STRIP, not the bar, so 93px of padding would be
            93px of blank between the last row and the strip. It measured
            exactly that: scroller 361x577 with 484px of usable column on
            /valves, i.e. ~2 rows of a 44px list spent on nothing.

            SO IT IS CONDITIONAL, AND THE NET COST OF FIXING THE OVERLAP IS
            ZERO ROWS: the strip takes 93px of column for its clearance and
            the scroller takes the same 93px back out of its own padding.
            Measured before and after at 393x852 — 484px of usable scroll on
            /valves both times.

            ⚠ 93 IS SPELLED AS A LITERAL HERE AND THAT IS NOT AN OVERSIGHT.
            `tabBarFloatingClearance.dom.test.jsx:195` greps the SOURCE of all
            seventeen padded screens for `paddingBottom: 93` / `pb-[93px]` /
            `padding: '... 93px'` — it is the only way one test can assert
            something about seventeen files — so `TAB_BAR_CLEARANCE` here would
            read as a screen that forgot its padding and fail. The literal
            cannot silently rot either way: that regex is BUILT from
            TAB_BAR_CLEARANCE, so moving the constant turns all seventeen red
            at once. REPORTED: when that check learns to accept the identifier,
            this becomes TAB_BAR_CLEARANCE like the strip below. */}
        <div
          className="w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: showStrip ? 0 : 93 }}
          data-name="valve-rows"
        >
          {result ? <ResultBanner result={result} onDismiss={() => setResult(null)} /> : null}

          {summary.total === 0 ? (
            /* NEW COPY. An empty scope is a real state — the drawer
               deliberately keeps locations with no systems — and saying so is
               the whole reason a non-matching name does not fall back to the
               fleet. */
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              {`Nothing in ${scopeLabel}. No systems are scoped here, so there is nothing to command.`}
            </p>
          ) : !hasValves ? (
            /* NEW COPY. "metering-only" is the word ValveManagementCard uses
               for the same fact, kept identical so the two surfaces agree. */
            <Card className="w-full py-4" data-name="valve-empty">
              <CardContent className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-foreground">No valves in this scope.</p>
                <p className="text-sm text-muted-foreground">
                  {`All ${num(summary.total)} ${plural(summary.total, 'system is', 'systems are')} metering-only - there is nothing here to open or close.`}
                </p>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            /* NEW COPY */
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              No systems match this filter.
            </p>
          ) : (
            <>
              {/* ── ONE CARD PER LOCATION ────────────────────────────────
                  Each `rowGroups` entry is a house-chassis card in a `gap-2`
                  stack, exactly like the Home stack. This replaces a bare run
                  of rows sitting directly on `--app-bg` under a full-bleed
                  opaque white band; see THE 2026-11-03 PASS in the header for
                  what was wrong with that and why.

                  THE PATH IS A QUIET HEADER *INSIDE* THE CARD, not a band over
                  the list: `text-xs font-medium text-muted-foreground` on the
                  card's own surface, with one inset hairline under it. It no
                  longer paints a colour of its own, so the `--app-bg` gradient
                  question that drove the old `bg-card` choice does not arise —
                  the card is the surface and the header simply sits on it.

                  THE HEADER IS NO LONGER `sticky`. That is a deliberate
                  reversal, argued in the header; the short form is that the
                  card's border is a stronger and always-present grouping cue
                  than a floating band, and that `overflow-hidden` on the house
                  chassis makes an inner `sticky` inert anyway.

                  NO `aria-label` ON THE `<section>`: a labelled section is a
                  LANDMARK, and one landmark per location would put ~17 of them
                  in a screen reader's rotor for a fleet list. The `<h2>` gives
                  the structure and the `<ItemGroup>`'s own `role="list"` takes
                  the name. */}
              <div className="flex flex-col gap-2" data-name="valve-location-stack">
                {rowGroups.map((group) => {
                  /* THE SECOND SELECT-ALL SCOPE. See `selectableByLocation`
                     above for what this list is and, crucially, what it
                     reaches: every selectable system at this location that
                     matches the current filter, INCLUDING any below the
                     `PAGE_SIZE` cut. */
                  const groupSelectable = selectableByLocation.get(group.key) ?? []
                  const groupReach = groupSelectable.length
                  const groupAll =
                    groupReach > 0 && groupSelectable.every((s) => selectedIds.has(s.id))
                  const groupSome = groupSelectable.some((s) => selectedIds.has(s.id))
                  /* NO BOX ON A LOCATION THAT HAS NOTHING TO SELECT. A card of
                     "No valve installed" rows would otherwise get a checkbox
                     that can only ever select 0 — the same dead end the
                     `showSelectAll` note removes from the fleet strip, and it
                     is removed here for the same reason rather than drawn
                     disabled. */
                  const groupHasBox = groupReach > 0
                  return (
                    <section
                      key={group.key}
                      className={cn(LOCATION_CARD, INSET_RULES)}
                      data-name="valve-location-card"
                      data-location={group.key}
                    >
                      {/* ── THE PER-LOCATION SELECT-ALL ────────────────────
                          `min-h-11` so the header carries the same 44px target
                          the rows do, and the WHOLE header is that target, not
                          the 18px box. The `closest()` guard is the row's and
                          the strip's — without it a press on the box toggles
                          twice and lands back where it started.

                          THE BADGE IS THE REACH, and it is the answer to "which
                          select-all did I just press": the fleet strip says
                          "Select all N matching" in words, each card says its
                          location and its own N. They are never the same
                          control and never the same number unless the scope has
                          one location. */}
                      <div
                        className={cn(
                          'flex w-full items-center gap-2.5 px-4',
                          groupHasBox ? 'min-h-11 cursor-pointer py-1 hover:bg-accent/50' : 'py-1.5',
                        )}
                        data-name="valve-location-select-all"
                        onClick={
                          groupHasBox
                            ? (e) => {
                                if (e.target?.closest?.('[data-slot="checkbox"]')) return
                                toggleLocation(group.key)
                              }
                            : undefined
                        }
                      >
                        {groupHasBox ? (
                          <Checkbox
                            checked={groupAll ? true : groupSome ? 'indeterminate' : false}
                            onCheckedChange={() => toggleLocation(group.key)}
                            /* NEW COPY. THE SCOPE AND THE NUMBER ARE BOTH IN THE
                               NAME, because two select-alls now exist and a
                               screen-reader user must never be unsure which one
                               they are on. The trailing clause appears only when
                               this box reaches past what is drawn. */
                            aria-label={`Select all ${num(groupReach)} ${plural(
                              groupReach,
                              'system',
                              'systems',
                            )} at ${group.path}${
                              groupReach > group.systems.length
                                ? `, including ${num(groupReach - group.systems.length)} not shown`
                                : ''
                            }`}
                            className="shrink-0"
                          />
                        ) : null}
                        <h2 className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                          {group.path}
                        </h2>
                        {groupHasBox ? (
                          <Badge variant="secondary" className="shrink-0 tabular-nums">
                            {num(groupReach)}
                          </Badge>
                        ) : null}
                      </div>
                      {/* The header's rule. `ItemSeparator` rather than
                          `Separator` so ONE inset declaration on the card covers
                          this and every row rule — the two primitives land on
                          different `data-slot` values. */}
                      <ItemSeparator />
                      <ItemGroup aria-label={group.path}>
                        {group.systems.map((s, i) => (
                          <Fragment key={s.id}>
                            {i > 0 ? <ItemSeparator /> : null}
                            <SystemRow
                              system={s}
                              checked={selectedIds.has(s.id)}
                              onToggle={() => toggle(s.id)}
                            />
                          </Fragment>
                        ))}
                      </ItemGroup>
                    </section>
                  )
                })}
              </div>

              {filtered.length > shown.length ? (
                /* SAY WHAT IS NOT DRAWN. A silent truncation reads as "this is
                   everything" when it is not. NEW COPY. */
                <div className="flex flex-col items-center gap-2 px-1 pt-3.5 pb-2">
                  <p className="text-xs text-muted-foreground">
                    {`Showing ${num(shown.length)} of ${num(filtered.length)} · select-all covers all ${num(selectableFiltered.length)}`}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRenderLimit((n) => n + PAGE_SIZE)}
                  >
                    {`Show ${num(Math.min(PAGE_SIZE, filtered.length - shown.length))} more`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ── THE SELECTION STRIP ───────────────────────────────────────────
            ONE bordered surface where there used to be two hand-rolled
            `<Card>`-alikes at `rounded-lg`, 48px apart, next to a real
            `<Card>` at `rounded-xl`. Top half: what select-all would take.
            Bottom half, on the first selection: what IS selected, what is
            being withheld from the action and why, and the two actions.

            IT NOW WEARS THE SAME CHASSIS AS THE LOCATION CARDS (2026-11-03).
            It used to be `rounded-xl border-border bg-card shadow-sm` — a
            12px-radius opaque-white floating card, and while the list had no
            card surface at all it was THE ONLY CARD-SHAPED THING ON SCREEN,
            which made the inconsistency louder rather than quieter. Now that
            the list is a stack of 18px cards, the strip takes `LOCATION_CARD`
            so there is exactly ONE card treatment on this screen. `shadow-sm`
            goes with it: the house cards carry no shadow, and the strip is
            already separated from the scroller by the page's own `gap-2`. */}
        {/* ── IT HAS TO CLEAR THE FLOATING PILL, AND IT DID NOT ─────────────
            2026-11-04, the owner, on a screenshot of /valves/100 Meridian
            Plaza: "I can't open and close the valve because it's overlapped.
            So fix it. Currently it can't be used."

            WHAT WAS ACTUALLY OVERLAPPING, MEASURED AT 393x852 BEFORE THE FIX:
              pill          y 775 -> 840
              strip         y 715 -> 844   (the column's py-2 is all that was
                                            under it)
              action bar    y 770 -> 843
              Close button  y 803 -> 835   ENTIRELY inside the pill's band
            `document.elementFromPoint` at the Close button's centre (98.7,
            819) returned a tab-bar BUTTON, not this control. Playwright
            refused to click it at all: "<button ...> from <div
            data-name=tabbar-host> subtree intercepts pointer events". The one
            thing this screen exists to do could not be done.

            WHY IT HAPPENED. The strip is the last child of the page column and
            the column runs to the frame's bottom edge, because TabBar's host
            is `relative shrink-0 h-0` and reserves NOTHING (2026-11-04, the
            owner: "and it needs to be completely floating"). Before that the
            bar was a 77px full-bleed slab that held its own column and
            anything sitting at the bottom of the page was automatically above
            it. Every scroll body in the app was given `paddingBottom: 93` in
            that pass; a bottom-pinned CONTROL is a different element and a
            different problem, and this one was missed.

            THE FIX IS THE SAME NUMBER ON THE RIGHT ELEMENT. `TAB_BAR_CLEARANCE`
            of margin under the strip puts its bottom edge where a scroll body's
            last row comes to rest. Measured after, both routes, both themes:
            the strip ends at y 751 against a pill at 775, so 24px of daylight
            (93 of margin over the column's own py-2, which is the same 101px
            above the frame edge a padded scroller already rests at), and
            `elementFromPoint` at the Close button's centre now returns the
            Close button. Driven end to end with real pointer clicks: select
            all -> Close N -> the sheet's escape hatch -> commit -> the result
            banner, on /valves and /valves/100 Meridian Plaza.

            NOT DONE, DELIBERATELY: z-index. Raising the strip over the pill
            would make the button paintable and still leave it under the bar's
            hit area, and the stacking order here is load-bearing in the other
            direction - the drawer (10/11) and the two sheets (50/300) must
            keep covering this strip. The bar is not in the strip's way because
            it is above it; it is in the way because the strip was in ITS
            band. Moving the strip out of that band is the fix. */}
        {showStrip ? (
          <div
            className={cn(LOCATION_CARD, 'shrink-0')}
            style={{ marginBottom: TAB_BAR_CLEARANCE }}
            data-name="valve-selection-strip"
          >
            {showSelectAll ? (
              <div
                className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-4 py-2"
                data-name="valve-select-all"
                onClick={(e) => {
                  /* The whole bar is the target. The box handles its own press
                     — without this guard a click on it would toggle twice and
                     land back where it started. A `<label htmlFor>` would not
                     work here: a label only forwards to a LABELABLE element,
                     and Radix's Checkbox is a `<button role="checkbox">`. */
                  if (e.target?.closest?.('[data-slot="checkbox"]')) return
                  toggleAllMatching()
                }}
              >
                <Checkbox
                  checked={allMatchingSelected ? true : someMatchingSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAllMatching}
                  /* NEW COPY. The NUMBER is the point — a bare "Select all"
                     whose scope is ambiguous is the footgun this label exists
                     to close. It counts SELECTABLE matches: a "No valve
                     installed" row can never join a selection. */
                  aria-label={`Select all ${num(selectableFiltered.length)} matching`}
                  aria-describedby={unselectableFiltered > 0 ? selectAllNoteId : undefined}
                  className="shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {`Select all ${num(selectableFiltered.length)} matching`}
                  </span>
                  {/* NEW COPY, AND THE WHOLE POINT OF THIS LINE: the rows that
                      are drawn but CANNOT be selected are accounted for, not
                      silently absent from the number above. "No valve
                      installed" is `VALVE_CATEGORIES`' own word, quoted
                      verbatim — it is the only reason a drawn row is
                      unselectable (`isSelectable`), so the sentence can name
                      the reason instead of gesturing at it. Nothing is shown
                      when every drawn row is selectable: then the number above
                      already covers all of them and a second line would be
                      noise on the screen's most dangerous control. */}
                  {unselectableFiltered > 0 ? (
                    <span id={selectAllNoteId} className="text-xs text-muted-foreground">
                      {`${num(unselectableFiltered)} of ${num(filtered.length)} rows shown can’t be selected - No valve installed`}
                    </span>
                  ) : null}
                  {/* THE TRI-STATE BOX AND THE COUNT BELOW CAN DISAGREE, AND
                      BOTH ARE RIGHT. `toggleAllMatching` only ever touches
                      `selectableFiltered`, so with 20 selected and a filter
                      matching none of them this box reads UNCHECKED while the
                      half below reads "20 selected". Separately correct,
                      together baffling — so the strip says which. NEW COPY. */}
                  {selectedCount > 0 && !someMatchingSelected ? (
                    <span className="text-xs text-muted-foreground">
                      {`None of the ${num(selectedCount)} you have selected ${plural(selectedCount, 'is', 'are')} in this filter, so this box is empty.`}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* NEW COPY. The select-all control is NOT DRAWN when nothing in
                the filtered set can be selected — see the long note at
                `showSelectAll`. A disabled checkbox over "Select all 0
                matching" was a control that could never do anything; this is a
                sentence that says why. */}
            {showNoneSelectable ? (
              <p
                className="px-4 py-3 text-sm text-muted-foreground"
                data-name="valve-none-selectable"
              >
                {`None of these ${num(filtered.length)} ${plural(filtered.length, 'system', 'systems')} can be selected - No valve installed, so there is nothing here to command.`}
              </p>
            ) : null}

            {showActions ? (
              <div
                className={cn(
                  'flex w-full flex-col gap-2 px-4 py-2',
                  (showSelectAll || showNoneSelectable) && 'border-t border-border',
                )}
                data-name="valve-action-bar"
              >
                {/* THE NUMBER ON EACH BUTTON IS THAT ACTION'S `willAct`, never
                    the selection. When they differ the line above states the
                    difference on its face, here, before the confirm sheet. */}
                <p className="text-xs leading-4 text-foreground">
                  {/* NEW COPY */}
                  <span className="font-semibold">{`${num(selectedCount)} selected`}</span>
                  {hiddenSelected > 0 ? (
                    <>
                      <span className="text-muted-foreground">{' · '}</span>
                      {/* THE HIDDEN COUNT IS THE CONTROL THAT UNHIDES THEM.
                          A number that reports a problem and offers no way out
                          of it makes the user hunt for the filter that caused
                          it. NEW COPY — the sentence is unchanged, it is now
                          also a button. */}
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto px-0 py-0 align-baseline text-xs font-normal text-muted-foreground underline underline-offset-2"
                      >
                        {`${num(hiddenSelected)} hidden by the filter`}
                      </Button>
                    </>
                  ) : null}
                  {blockedSelected.length > 0 ? (
                    <span className="text-muted-foreground">{` · ${excludedSentence(blockedSelected)}`}</span>
                  ) : null}
                </p>
                <div className="flex w-full items-center gap-2">
                  <Button
                    type="button"
                    /* THE VARIANT IS `destructive`, AND THE FOOTPRINT IS NOT A
                       SLAB. This control shuts water off in occupied
                       buildings. Plain primary said nothing about that — it
                       was the same blue as every other action in the app — and
                       the full-width saturated red block it replaced said it
                       far too loudly, as a wall of colour sitting above a
                       disabled twin.

                       The design system's own answer is the `destructive`
                       Button variant (Figma set 6716:46634). The repo had
                       already WRITTEN DOWN that this is the button it means:
                       `ValveManagementCard.jsx:721` keeps the card's entry
                       button off `destructive` because "that red is reserved
                       for the control that actually shuts water off, and that
                       control is on the screen this opens", and a test pins
                       it. This is that control.

                       FOR THE RECORD, AND DELIBERATELY NOT ACTED ON HERE: the
                       owner has since observed that danger is CONTEXTUAL —
                       closing in bulk is the dangerous direction on THIS
                       screen, but closing one valve during a live leak is the
                       SAFE act. That is a queued separate task on the event
                       screen. This screen's treatment does not change.

                       GOV.UK: "do not only rely on the red colour of a warning
                       button to communicate the serious nature of the action."
                       Three non-colour cues carry it. The COUNT is in the
                       label, so the thumb passes over the number to commit and
                       the control is polymorphic, which is what defeats
                       habituation. The GLYPH is `DropletOff` — water, stopped,
                       the physical act rather than a generic hazard triangle;
                       `aria-hidden`, so the accessible name stays exactly
                       `Close N valves`. And the LINE ABOVE already states the
                       selection and every exclusion before the sheet is ever
                       opened. */
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    disabled={closeTargets.willAct.length === 0}
                    onClick={() => setPending({ action: 'close' })}
                  >
                    <DropletOff aria-hidden="true" />
                    {`Close ${num(closeTargets.willAct.length)} ${plural(closeTargets.willAct.length, 'valve', 'valves')}`}
                  </Button>
                  {/* THE SECONDARY, AND IT IS PUSHED AWAY FROM THE PRIMARY.
                      The two are not equals in this moment — usually one of
                      them is disabled — and sitting them shoulder to shoulder
                      at equal width was what made them look like a pair of
                      choices. `ml-auto` puts the gap of the bar between them,
                      so the reach to Open is deliberate and the red one is not
                      something the thumb brushes on its way past. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto shrink-0"
                    disabled={openTargets.willAct.length === 0}
                    onClick={() => setPending({ action: 'open' })}
                  >
                    {`Open ${num(openTargets.willAct.length)}`}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* THE ONE FILTER SURFACE, shared with /alerts. `absolute inset-0`
          inside this page and no portal, which is the constraint that rules
          out shadcn's usual Popover-plus-Command recipe - see that file's
          header and this one's.
          `groups` is keyed by the keys of `filter`, so `onApply` hands back
          the filter itself and `applyFilter` sets it whole. Nothing is
          translated at this boundary and nothing can drift. */}
      <FilterSheet
        open={filterOpen}
        title="Filter valves"
        groups={groups}
        value={filter}
        onApply={applyFilter}
        onClose={() => setFilterOpen(false)}
      />

      {/* The confirmation. `absolute inset-0` inside this page — no portal. Its
          ~800ms arming delay, its Escape-to-cancel and its exclusion buckets
          sitting ABOVE the confirm button are all deliberate, and nothing here
          works around any of them. */}
      <BulkValveConfirmSheet
        action={pending ? pending.action : null}
        scopeLabel={scopeLabel}
        /* ALWAYS 'selection', on every route this screen serves. It acts over
           what the user ticked, never over a whole scope — that is what the
           screen IS — so neither of the sheet's scope-wide sentences is ever
           true here, scoped route or unscoped. */
        scopeKind="selection"
        willActCount={pendingTargets ? pendingTargets.willAct.length : 0}
        offlineSystems={
          pendingTargets
            ? pendingTargets.skipped.offline.map((s) => ({
                id: s.id,
                name: s.name,
                /* NEW COPY: the "Last seen " prefix. `formatLastSeen` returns
                   'Unknown' for a missing timestamp and "Last seen Unknown" is
                   worse than the sheet's own fallback word, so that case falls
                   through to it. */
                lastSeenLabel: s.lastSeen ? `Last seen ${formatLastSeen(s.lastSeen)}` : 'Offline',
              }))
            : []
        }
        noValveCount={pendingTargets ? pendingTargets.skipped.noValve.length : 0}
        faultedCount={pendingTargets ? pendingTargets.skipped.faulted.length : 0}
        closingCount={pendingTargets ? pendingTargets.skipped.closing.length : 0}
        alreadyInStateCount={pendingTargets ? pendingTargets.skipped.alreadyInState.length : 0}
        onConfirm={commit}
        onCancel={() => setPending(null)}
      />

      <WintSidebarV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <TabBar activeTab="home" />
    </div>
  )
}

/* ── Small pieces, below the screen so the screen reads top-down ────────── */

/* NEW COPY, all of it. The exclusion clause on the strip's face, built from
   `blockedReasonOf`'s answer for each selected system — never re-derived.
   Phrased in systems, because that is what this screen counts
   (`valveScope.js`: a system is not one valve). */
function excludedSentence(blocked) {
  const counts = { offline: 0, 'no-valve': 0, error: 0, closing: 0 }
  for (const s of blocked) {
    const reason = blockedReasonOf(s)
    if (reason && reason in counts) counts[reason] += 1
  }
  const parts = []
  if (counts.offline) parts.push(`${num(counts.offline)} offline`)
  if (counts.error) parts.push(`${num(counts.error)} in Valve Error`)
  if (counts.closing) parts.push(`${num(counts.closing)} already closing`)
  if (counts['no-valve']) parts.push(`${num(counts['no-valve'])} with no valve installed`)
  return `${parts.join(' · ')} excluded`
}

/* NEW COPY. "COMMANDED", never "closed": this app records a command and never
   hears back from the hardware, so "4 valves closed" would be exactly the
   false confidence the feature exists to prevent. The record is persistent and
   dismissible, not a toast. */
const BUCKET_WORD = {
  offline: 'offline',
  noValve: 'no valve installed',
  faulted: 'in Valve Error',
  closing: 'already closing',
  alreadyInState: 'already in that state',
}

function ResultBanner({ result, onDismiss }) {
  const verb = result.action === 'close' ? 'close' : 'open'
  const skippedCount = result.attemptedOver - result.commanded
  return (
    <Card role="status" className="mb-2.5 w-full gap-2 py-3" data-name="valve-result">
      <CardContent className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">
          {result.commanded === 0
            ? `Nothing was commanded to ${verb}.`
            : `${num(result.commanded)} ${plural(result.commanded, 'valve', 'valves')} commanded to ${verb}.`}
        </p>
        {skippedCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            {`${num(skippedCount)} of ${num(result.attemptedOver)} selected ${plural(skippedCount, 'was', 'were')} not commanded: ${result.buckets
              .map((b) => `${num(b.count)} ${BUCKET_WORD[b.bucket]}`)
              .join(' · ')}.`}
          </p>
        ) : null}
        {!result.recorded ? (
          <p className="text-xs text-muted-foreground">The command could not be recorded.</p>
        ) : null}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start px-0 py-0"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </CardContent>
    </Card>
  )
}
