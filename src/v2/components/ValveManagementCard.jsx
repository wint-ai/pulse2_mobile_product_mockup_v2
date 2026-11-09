/**
 * ValveManagementCard — a READ-ONLY readout of valve states across a scope,
 * plus the way in to the screen that manages them. Mounted at the LOCATION
 * level and the ACCOUNT level (`HomeAllAccounts.jsx:1358`).
 *
 * ══ 2026-11-02 — THE REDESIGN. READ THIS BEFORE CHANGING ANYTHING BELOW. ══
 *
 * The owner, 2026-11-02, verbatim:
 *   "the widget for valves looks too messy. Too much information, it's not
 *    organized well, it's too big... It doesn't feel like the ShadCN
 *    components... It needs to be much more clear, much more easy to
 *    understand to open, close the valves, to see statuses."
 *
 * He authorised implementation without further permission. What that bought,
 * measured rather than asserted:
 *   · the card was ~520px of the 808px usable frame — 64% of it;
 *   · it used ONE shadcn component in 906 lines;
 *   · 6 distinct `text-[Npx]` sizes and 12 distinct arbitrary spacing values.
 * It is now ~317px (the arithmetic is at the foot of this header), four shadcn
 * primitives deep, and on the 4px spacing scale.
 *
 * ── 1. THE DONUT IS BACK. THE OWNER OVERRULED ITS REMOVAL, HAVING SEEN IT. ──
 *
 * This section used to read "THE DONUT IS GONE. THIS REVERSES AN EXPLICIT
 * REQUEST BY THE OWNER." It was removed in `b7749a8` on 2026-11-02 under the
 * blanket "implement without permission" authorisation, and the removal was
 * recorded here RATHER THAN QUIETLY DONE so the owner could overrule it
 * cheaply. On 2026-11-03 he did exactly that, verbatim:
 *
 *   "the valve status widget, I don't think the current solution is the best
 *    visualization for that. Maybe we can try something else like PyChart
 *    donut or something like that."
 *
 * That is the process working, not failing: the argument was put in writing,
 * he read the result on a real screen, and he decided. HIS CALL IS FINAL AND
 * THIS FILE DOES NOT RE-LITIGATE IT. The old argument is KEPT BELOW, in full,
 * because it is the record of a reversal and because two of its five points
 * are still live and still constrain what may be built here.
 *
 * ── 1a. WHY HE IS RIGHT ABOUT THE BAR — MEASURED IN A BROWSER, 2026-11-03 ──
 * A screenshot harness landed this session (`scripts/shot.mjs`), so for the
 * first time these claims are measurements rather than class arithmetic:
 *   · THE 10px BAR READS AS A PROGRESS BAR, NOT A CHART. Two cards up the same
 *     scroll, SystemHealthCard draws `data-name="Progress Bar"` — a thin
 *     red/green track of near-identical dimensions meaning something else
 *     entirely. Two near-twin bars on one screen is a worse misread than any
 *     the donut ever produced.
 *   · EVERY SEGMENT IS `rounded-full` WITH `gap-0.5`, so at the live fleet mix
 *     (error 2 of 103) the error segment renders as a DETACHED PILL at the
 *     left end and `closed` as another. Three disconnected lozenges, not one
 *     divided whole — which is the one thing a part-to-whole mark must be.
 *   · THE `none` SEGMENT IS A HOLLOW OUTLINED PILL AT THE RIGHT END, which is
 *     precisely the grammar of "unfilled progress remaining". It reinforces
 *     the misread rather than correcting it.
 *   · THE 2x2 STAT GRID HAS RAGGED CHEVRONS: `· 2 offline` on some tiles and
 *     not others pushes those chevrons right, so the two columns never align.
 * Card height before this change, MEASURED: 319.5px. (The arithmetic at the
 * foot of this header predicted 317. It was right, which is worth recording —
 * but it is no longer the way a layout claim gets made in this file.)
 *
 * ── 1b. THE FIVE ORIGINAL OBJECTIONS, SCORED ──────────────────────────────
 * Kept verbatim in substance, with what the 2026-11-03 build does to each.
 *
 *   a. IT WAS 162px — 31% OF A CARD WHOSE HEADLINE DEFECT IS ITS HEIGHT.
 *      >> STILL STANDS, PARTLY MITIGATED. Height is still the card's weakest
 *      dimension and the ring still costs some of it. What changed is that the
 *      ring is no longer stacked ABOVE the categories: donut and legend sit
 *      SIDE BY SIDE, so the ring is paid for out of horizontal space the 2x2
 *      grid was wasting, and the ring itself is 104px rather than 162px. The
 *      measured cost is in THE HEIGHT, MEASURED at the foot of this header.
 *      Do not pretend this one was answered. It was reduced.
 *   b. IT WAS NOT TO SCALE, and the file admitted it: "below MIN_SWEEP_DEG/360
 *      = 1.7% THE DONUT IS NO LONGER TO SCALE. A 1-system Error slice and a
 *      5-system Error slice in a 400-system scope draw at the same width."
 *      >> ANSWERED, AND THIS IS THE SINGLE MOST IMPORTANT CHANGE IN THE
 *      REBUILD. THERE IS NO MINIMUM SWEEP. `MIN_SWEEP_DEG` and the
 *      `sweepsFor()` debt-redistribution algorithm it needed are gone and are
 *      not coming back. Arcs are drawn exactly proportional; a 1-of-400 slice
 *      draws at 0.9 degrees, is very nearly invisible, and that is CORRECT —
 *      the legend row beside it says "1" in text and TEXT IS THE AUTHORITY.
 *      The one thing this build will never do is draw a slice LARGER than its
 *      share. See THE GAP, AND THE ONLY PLACE GEOMETRY BENDS below for the
 *      exact rule, which bends only downward and never up.
 *   c. IT WAS NOT TAPPABLE, and could not be made so: at a 361px card the ring
 *      band is ~28px, so no arc reaches a 44px target radially at ANY share.
 *      >> ANSWERED BY NOT ASKING THE ARCS TO BE TARGETS. The objection was
 *      sound about arcs and wrong about the design: THE LEGEND ROWS ARE THE
 *      44px TARGETS. Each is a `min-h-11` button that deep-links exactly as
 *      the old `StatTile` did, so every category is still a control and the
 *      "chart is a control" win is kept whole. The ring is honestly inert —
 *      `aria-hidden`, `pointer-events-none` — and says so.
 *   d. IT DID NOT ENCODE OFFLINE AT ALL.
 *      >> STILL STANDS, UNCHANGED, AND IS NOT FIXABLE IN A RING. Offline is
 *      ORTHOGONAL to open/closed/error — an offline system is also one of the
 *      three — so a fifth wedge would double-count the scope. It lives in
 *      each legend row ("· 1 offline"), which since 2026-11-03 is the ONLY
 *      place it lives on this card: the denominator line that also totalled
 *      it was deleted that day at the owner's instruction (see THE
 *      DENOMINATOR LINE IS GONE). That sub-line is the honest place for it
 *      and the ring still does not get it.
 *   e. SHRINKING IT WAS THE WORST AVAILABLE OPTION — a thinner ring is harder
 *      to read and smaller slices are less discriminable AND less tappable.
 *      >> MOOT. Tappability left the arcs (see c), so the only cost of a
 *      smaller ring is discriminability. At 104px with a 12-unit band the ring
 *      is slimmer than the old 162px one; it is also no longer carrying any
 *      job but "show the shape of the mix".
 *
 * WHAT IS NOT KEPT FROM THE OLD ARGUMENT: the FT line ("consider a
 * magnitude-type chart instead") and the UK Analysis Function's stacked-bar
 * guidance. Both are still true as general advice and both were used to
 * justify a bar the owner has now rejected on sight. Citing them again here
 * would be re-litigating a decision that has been made.
 *
 * ── 2. WHAT IS DRAWN NOW, AND WHY THE CHART IS STILL A CONTROL ────────────
 *
 * A DONUT ON THE LEFT, A COLUMN OF TAPPABLE LEGEND ROWS ON THE RIGHT — one
 * flex row inside the card's existing `px-6` body. This replaced BOTH
 * `<SegmentedBar>` and the 2x2 `<ul>` of `<StatTile>`s; neither survives.
 *
 *   · `<Donut>` — an inline `<svg viewBox="0 0 100 100">`, one `<circle>` per
 *     non-empty category, `r=40`, sliced with `stroke-dasharray` /
 *     `stroke-dashoffset` and rotated -90deg so the first slice starts at 12
 *     o'clock. NOT hand-rolled arc `<path>` data: dasharray is a fraction of
 *     the code and cannot produce the large-arc-flag bugs the old
 *     implementation had. Rendered 104px square (`size-26`), `shrink-0`.
 *     DECORATIVE AND SAYS SO: `aria-hidden` + `pointer-events-none` on the
 *     wrapper AND on the svg. The legend carries every number and every word,
 *     so a reader that saw both would read the scope twice.
 *   · `<LegendRow>` x4 — swatch, category word, count, the per-category
 *     offline sub-count, and a chevron on the three that navigate. EACH ONE IS
 *     A BUTTON that opens the management screen already filtered to that
 *     category, with the SAME `aria-label` sentences the stat tiles used —
 *     that copy is the owner's approved surface and is carried over verbatim.
 *
 * THE CHART IS STILL A CONTROL. That was the strongest thing the bar design
 * bought and it is not given back: the categories are still buttons, they
 * still deep-link, and the only thing that changed is which mark sits beside
 * them.
 *
 * THE RAGGED CHEVRONS ARE FIXED BY CONSTRUCTION. The count column is
 * right-aligned against a fixed trailing slot, and the `none` row — which has
 * no chevron — renders a `size-4` spacer in its place. So all four counts and
 * all three chevrons line up down one edge whether or not a row carries an
 * offline note, which the 2x2 grid could not do.
 *
 * WHY THE OFFLINE NOTE IS ON ITS OWN LINE. Measured at the live fleet mix:
 * the legend column is ~197px, and "No valve installed" (112px) + swatch +
 * count + "· 1 offline" (58px) does not fit on one line inside it. The brief's
 * rule is "shrink the donut before you shrink the type"; the third option is
 * to spend a line, which costs nothing because `min-h-11` already reserves
 * 44px for the 44px target and a one-line row only centres inside it. So the
 * offline note is a muted second line, indented `pl-4` to clear the swatch,
 * and every row is 44px tall either way.
 *
 * ── THE GAP, AND THE ONLY PLACE GEOMETRY BENDS ────────────────────────────
 * Adjacent segments are parted by a 2px surface-coloured GAP, baked into the
 * dasharray — a gap, never a border drawn around the marks.
 *
 * A gap has to be taken out of something, so here is the exact rule and the
 * exact claim it supports:
 *
 *   len_i   = (count_i / total) * CIRCUMFERENCE        exactly proportional
 *   gap_i   = min(GAP_UNITS, len_i / 2)
 *   drawn_i = len_i - gap_i
 *   start_i = (cumulative count before i / total) * CIRCUMFERENCE + gap_i / 2
 *
 * THE CLAIM: NO SLICE IS EVER DRAWN LARGER THAN ITS SHARE. `drawn_i <= len_i`
 * always, and the slice BOUNDARIES — the centres of the gaps — sit at the
 * exact cumulative fractions. That is the opposite of the old `MIN_SWEEP_DEG`,
 * which INFLATED small slices and therefore lied in the direction that
 * matters: it made a rare bad state look commoner than it is.
 *
 * The `min(…, len/2)` clamp is there so the gap cannot consume a slice whole.
 * It is NOT a minimum sweep: it is a cap on the SUBTRACTION, it only ever
 * moves a slice toward zero, and inside that regime proportionality is still
 * exact — a 2-of-400 slice draws at exactly twice a 1-of-400 slice, because
 * both are drawing at len/2. Pinned by test
 * (`valveManagementCard.dom.test.jsx`, "a 1-of-many slice is not floored").
 *
 * ── 3. ONE STATE, ONE COLOUR CUE ──────────────────────────────────────────
 * Every row used to draw a `--valve-*` swatch ~6px from a `ValveStatus` glyph,
 * and for the SAME state they disagreed: open = green dot + BLUE glyph;
 * closed = blue dot + GREY glyph; error = pink dot + RED glyph. Worse,
 * `index.css:376-381` explicitly REJECTED that red (#fb2c36) as the valve
 * error colour — against the open green it measures dE 2.3 under deuteranopia
 * — so the palette's accessibility argument was being defeated six pixels from
 * where it was made.
 *
 * `<ValveStateReadout>` / `<ValveSwatch>` (`ValveStateReadout.jsx`) now carry
 * the one cue, and the WORD is the secondary encoding that keeps the palette
 * legal under `index.css:358-367` (dE 7.6, "legal ONLY WITH SECONDARY
 * ENCODING"). The word is not optional and there is no prop that removes it.
 * `ValveStatus.jsx` IS NOT TOUCHED — it is still the per-system card's
 * artwork and is out of this redesign's scope.
 *
 * DELETED FROM THIS FILE AND IMPORTED INSTEAD: the local `FILL`, `GLYPH`,
 * `LABEL_OF` and `Swatch` (the old `:424-452`). The old `Swatch` painted with
 * an inline `style={{backgroundColor}}`, which no theme can reach; the atom
 * uses the `bg-valve-*` token utilities (`index.css:866-868`) and therefore
 * follows all four.
 *
 * ── 4. THE SHADCN TELLS, SO THIS READS NATIVE ─────────────────────────────
 * `text-sm` body, and `text-2xl` for exactly ONE figure — the donut's centre
 * total. NO `text-[Npx]` anywhere. Secondary text is always
 * `text-muted-foreground` — never an opacity hack, never a grey literal. The
 * 4px scale: `gap-0.5 / gap-2 / gap-3 / pl-4 / px-2 / px-6 / py-3 / pt-4 /
 * min-h-11 / size-26`. `rounded-md` on the legend rows and the button,
 * `rounded-full` on the chips. `data-slot` on every part, inherited from the
 * primitives.
 *
 * PROPORTIONAL FIGURES IN THE DONUT CENTRE, TABULAR FIGURES IN THE LEGEND.
 * They are not interchangeable and the split is deliberate. Equal-width digits
 * on a large standalone number make `121` look loose and gappy at display
 * sizes, so the centre total takes the font's PROPORTIONAL figures. The legend
 * counts are a COLUMN a reader scans down, which is the one place tabular
 * figures earn their keep, so they get `tabular-nums`.
 *
 * FOUR shadcn primitives now, where there was one:
 *   `<Item asChild size="sm">`   the legend row's chassis — radius, border
 *                                box, `transition-colors`, `text-sm` and the
 *                                house focus ring, none of it hand-rolled.
 *                                Only the SIZE variant is overridden
 *                                (`flex-col items-start justify-center gap-0
 *                                px-2 py-0 min-h-11`), because a two-line
 *                                legend row stacks where a list row does not.
 *   `<Separator>`                the rule above the entry bar, replacing a
 *                                hand-rolled `border-t`.
 *   `<Button>`                   unchanged, and still the DEFAULT variant.
 *   `<ValveStateReadout>` / `<ValveSwatch>`  the state atom.
 *
 * WHY NOT `<ItemGroup>` AND `<ItemSeparator>`. The legend IS a vertical list
 * of rows now, so the old reason ("this card no longer has one") has expired —
 * but the OTHER half of that note has not, and it is the binding one:
 * `ItemGroup` is `role="list"`, and a `<button>` placed directly inside a
 * `role="list"` is invalid markup. The legend rows are buttons, so a plain
 * `<ul>/<li>` with `<Item asChild>` on each row is still the correct shape —
 * it keeps the semantics valid and still takes the chassis from the primitive.
 * `ItemSeparator` is declined separately: 44px rows with a 2px gap read as a
 * legend; ruled rows read as a settings list and would compete with the
 * `<Separator>` above the entry bar. The management SCREEN is where
 * `ItemGroup` + `ItemSeparator` belong; that file is not this one's to write.
 *
 * WHY THE CHASSIS IS NOT `<Card>`. `card.jsx:40-68` settled this already and
 * the reasoning is unchanged: this app has TWO card surfaces — `<Card>` is
 * `--card` (white) with `rounded-2xl` and a two-layer shadow, the house
 * chassis is `--surface-card` (#fafbfc) with `rounded-[18px]` and no shadow.
 * Every one of this card's five stack neighbours is the house chassis.
 * Switching one of six would repaint it against the other five and move
 * pixels, which is a worse "doesn't feel like the ShadCN components" than the
 * radius it would fix. `rounded-[18px]` and the absent shadow are therefore
 * the two arbitrary values that stay, deliberately, and only on the shell.
 *
 * ── THE CHEVRON, THIRD TIME ───────────────────────────────────────────────
 * It was removed once (rows toggled a tick box, so a `>` promised a drill-down
 * that did not exist), restored when the rows became navigation, and it STAYS
 * now for the same reason it was restored: the rows navigate, there is a
 * destination, and a tappable number with no affordance is the one way the
 * "chart is a control" win above could be lost. It is on exactly the three
 * rows that navigate — and the fourth reserves its slot with a `size-4`
 * spacer, so its absence costs no alignment.
 *
 * ══ WHAT CAME INTO THE REDESIGN UNCHANGED (Rule 0) ═══════════════════════
 *
 * ── THIS CARD DOES NOT ACT, AND THAT IS THE OWNER'S INSTRUCTION ───────────
 *   "i dont like the way its built. the widget needs to be display only for
 *    managing valve i want to open a dedicated screen so user can
 *    select/deselect specific valves can filter per location / etc. main
 *    widget is display only"
 * Tick boxes, action bar, `BulkValveConfirmSheet`, result panel, retry and
 * `recordBulkValveCommand` left on 2026-11-02 for
 * `src/v2/pages/ValveManagementScreen.jsx`, reached by the routes this card
 * links to:
 *     /valves                 fleet / unscoped
 *     /valves/:locationName   scoped, mirroring /location/:locationName
 * If those routes are dead, THAT is the regression — not this card.
 * `.claude/skills/v2-page-parity/SKILL.md:12-21` (Rule 0) forbids removing
 * working functionality without the owner's explicit permission; the message
 * above is the permission, for this card only.
 *
 * ── THE OFFLINE REQUIREMENT, WHICH IS WHY A BUTTONLESS READOUT EARNS ITS SEAT
 *   "we have a kind of an offline devices that Valve cannot be shut off. So we
 *    need to explain the user this situation somehow and to not let him think
 *    that this Valve will take place on this operation that he wants to."
 * Two of its three sites went to the screen with the action. THE THIRD IS HERE
 * AND IS NOT NEGOTIABLE:
 * ONE SITE SURVIVES ON THIS CARD, AND IT IS NOW THE ONLY ONE:
 *   · the LEGEND ROW count INCLUDES offline systems and says so under itself
 *     ("· 1 offline") — an offline system is still at its last-known state
 *     and still part of the scope.
 * That sub-line is NOT decoration and is not a candidate for the next round of
 * tightening. If it goes, this card stops encoding offline at all.
 *
 * THE SECOND SITE, THE DENOMINATOR LINE, WAS DELETED ON 2026-11-03. See THE
 * DENOMINATOR LINE IS GONE below. The requirement did not go with it — read
 * that section before restoring anything.
 *
 * OFFLINE IS DELIBERATELY OUTSIDE THE FOUR DONUT SLICES — objection (d) in
 * section 1b, which still stands. It is an orthogonal dimension — an offline
 * system is ALSO open, closed or in error — so folding it in as a fifth wedge
 * would double-count the scope and is a dishonest merge. It belongs to the
 * per-row sub-line, which is the only honest place left for it.
 *
 * ── THE DENOMINATOR LINE IS GONE (2026-11-03), AND RULE 0 DOES NOT RESTORE IT
 * The card used to close with a muted line reading
 *     `83 systems with a valve · 79 can be commanded · 3 offline`
 * and THIS HEADER CALLED IT "NOT NEGOTIABLE". That was wrong, and the wrongness
 * is left standing above rather than quietly edited out, because this is the
 * second owner reversal on this card in two days and the pattern is the point.
 *
 * The owner, 2026-11-03, screenshotting the line, verbatim:
 *     "remove this sentence. I want it much more clear."
 * Offered three options — replace it with a gap-only line, delete it outright,
 * or move it onto the button — he chose DELETE OUTRIGHT, with nothing in its
 * place. That is what is implemented. He is also right on the merits, and the
 * three reasons were checked against the rendered card rather than asserted:
 *
 *   1. IT MIXED TWO DENOMINATORS INSIDE ONE SENTENCE. At the fleet scope
 *      `83 systems with a valve` EXCLUDES the 20 no-valve systems, while the
 *      `3 offline` beside it INCLUDES one of them — the legend shows
 *      "· 2 offline" on Open and "· 1 offline" on No valve installed. Two of
 *      the three numbers in one line were counting DIFFERENT POPULATIONS, with
 *      nothing marking the switch. That is a correctness defect, not verbosity,
 *      and it is the reason this section does not mourn the line.
 *   2. TWO OF THE THREE NUMBERS WERE ALREADY ON SCREEN. `83` is 103 minus the
 *      No-valve row's own 20, and `3 offline` is the sum of the per-row
 *      sub-counts sitting directly above it. A readout that restates its own
 *      legend is the "too much information" complaint that started the
 *      2026-11-02 redesign.
 *   3. THE ONE NON-DERIVABLE NUMBER WAS `79 can be commanded` — and the fact
 *      worth having was the GAP it implied (4 valves that will not respond),
 *      which the line never stated. It left the only new information to the
 *      reader's arithmetic.
 *
 * WHY THIS IS NOT A RULE 0 VIOLATION, STATED SO NOBODY "FIXES" IT BACK. The
 * owner's offline requirement — "we have a kind of an offline devices that
 * Valve cannot be shut off... to not let him think that this Valve will take
 * place on this operation that he wants to" — is tied to THE OPERATION. It is
 * a promise about what a command will and will not touch. THIS CARD DOES NOT
 * OPERATE; IT NAVIGATES. Its one control changes route. So the requirement is
 * carried here by the per-row sub-counts, and IN FULL where the action actually
 * happens: `ValveManagementScreen.jsx` and `BulkValveConfirmSheet.jsx`, which
 * size every batch with `targetsFor`/`targetsForSelection` and list the skipped
 * systems by name. Deleting a restatement on a readout removes no guarantee
 * from any command. `.claude/skills/v2-page-parity/SKILL.md:12-21` forbids
 * removing working FUNCTIONALITY without the owner's explicit permission; the
 * quote above is that permission, and a sentence is not a function.
 *
 * WHAT WENT WITH IT: `data-name="valve-denominator"`, and the `actionableTotal`
 * / `offlineTotal` destructuring, which had no other reader. `summariseValves`
 * still returns both — `valveScope.js` is untouched and the SCREEN still uses
 * them — so restoring the line is a render-side edit if he reverses again.
 *
 * ── WHAT THIS COMPONENT IS NOT ALLOWED TO KNOW ───────────────────────────
 * It derives NOTHING about valves. `valveScope.js` is the single source of
 * what a state means; this file calls `summariseValves` and renders the
 * answer. A second copy of that rule living in a component is the exact defect
 * that module was extracted to prevent (`valveScope.js:12-18`).
 *
 * ── THE DEEP LINK, AND A CAVEAT ──────────────────────────────────────────
 * Tapping a stat tile opens the screen ALREADY FILTERED to that category,
 * passed as `?state=<VALVE_CATEGORIES key>` — `error` | `open` | `closed`.
 * The key, not the label: the label is Figma's English and the key is the
 * contract `valveScope.js` already publishes to every other caller.
 *
 * RECONCILED 2026-11-02, AND THE RECORD OF WHAT WAS WRONG IS KEPT. This card
 * was written while `ValveManagementScreen.jsx` did not exist on disk, so
 * `STATE_PARAM` was DEFINED here rather than matched against it. When the
 * screen first landed it imported `useLocation` for `key` only and never read
 * `location.search`, so the deep link arrived at the right SCOPE and the wrong
 * FILTER — `/valves/320%20Summit%20Blvd?state=open` rendered the identical
 * list with its "All" chip still selected. The screen's redesign closed that
 * in the same pass as this one: it now reads the param
 * (`ValveManagementScreen.jsx:408`, `new URLSearchParams(search).get('state')`)
 * and re-seeds on every change of `location.search`. The two ends of this
 * contract are therefore agreed as of this commit and NOT BY INFERENCE — the
 * read was checked in the file, and `valveWidgetMount.dom.test.jsx` drives the
 * press and asserts the resulting URL.
 * IF THE SCREEN EVER PICKS A DIFFERENT KEY, change `STATE_PARAM` below — never
 * the four category keys, which are `valveScope.js`'s published contract.
 *
 * ── "No valve installed" IS PRESENT, NOT ABSENT ──────────────────────────
 * It gets a tile, no chevron and no navigation: there is nothing to manage
 * there and the dedicated screen cannot act on it. It stays
 * `aria-disabled="true"` — never the `disabled` attribute, which some
 * assistive tech skips outright so the user never learns WHY — with the reason
 * inside its accessible name.
 *
 * ── TOKENS, AND THE TRAP ─────────────────────────────────────────────────
 * A Tailwind colour utility naming a token this repo does not define falls
 * through to STOCK Tailwind and then freezes across all four themes — there is
 * no `--green-*` token at all, which is how >=3 invisible-in-dark defects got
 * in. Every colour here was checked against all four blocks of `src/index.css`:
 * `:root`, `[data-theme='dark'], .dark`, `[data-theme='sand']`,
 * `[data-theme='contrast']`.
 *   --valve-open / --valve-closed / --valve-error  :410-412, :1343-1345,
 *     :1508-1510, :1680-1682, registered in `@theme inline` at :886-888, so
 *     BOTH `bg-valve-*` AND `stroke-valve-*` resolve in all four — Tailwind v4
 *     generates every colour utility family, `stroke-*` included, off the one
 *     `--color-*` namespace. VERIFIED IN A BROWSER on 2026-11-03 rather than
 *     assumed: the three arcs' computed `stroke` was read back in all four
 *     themes and matches the token, not a stock Tailwind fallback. That check
 *     is the whole reason this note exists — a colour utility naming a token
 *     the repo does not define falls through to STOCK Tailwind and then
 *     FREEZES across all four themes, silently. The CHIPS get their colour
 *     from `ValveStateReadout`; the ARCS name the same three tokens through
 *     `ARC_STROKE` below.
 *   --border, --foreground, --muted-foreground, --surface-card, --card,
 *     --primary, --accent, --ring  all four blocks, all pre-existing.
 * `none` GETS NO FILL anywhere — a hollow chip, and a muted `stroke-border`
 * arc in the ring, which is how `<ValveSwatch>` draws it. Deliberate twice
 * over: there is no themed neutral that passes the chart validator's lightness
 * band and chroma floor (under `contrast` every neutral is saturated, so a
 * filled `bg-border` chip came out orange), and "no valve" is a property of
 * SYSTEMS while open/closed/error is a property of VALVES.
 *
 * THE GAP IS A GAP, NOT A STROKE. The 2px parting between adjacent arcs is
 * absence — the card surface showing through — not a `--surface-card` outline
 * painted around each mark. An outline would need its own token, would have to
 * be re-checked against four themes, and would still be wrong on any surface
 * the card is ever dropped onto.
 *
 * ── ONE KNOWN DEFECT, MEASURED AND NOT INTRODUCED HERE ────────────────────
 * UNDER `contrast`, THE `none` ARC IS EFFECTIVELY INVISIBLE. Read off the live
 * page on 2026-11-03:
 *     --surface-card   oklch(0.8  0.25 85)
 *     --border         oklch(0.8  0.25 60)
 * Identical lightness, identical chroma, 25 degrees of hue apart — so there is
 * NO luminance contrast at all between the `none` band and the card it is
 * drawn on. The other three themes are fine (border L 0.929 / 0.37 / 0.923
 * against surface L 0.988 / 0.241 / 0.993).
 *
 * THIS IS A THEME-TOKEN COLLISION, NOT A CHART BUG, AND IT PREDATES THIS
 * BUILD. Every `--border` mark on a `--surface-card` surface has it: the
 * SegmentedBar's `none` segment was `border-border bg-transparent` and was
 * equally invisible under `contrast`, and `<ValveSwatch>`'s hollow `none` chip
 * — sitting in the legend row beside this very arc — still is.
 *
 * IT IS DELIBERATELY NOT FIXED HERE. `--border-strong` reads in all four
 * (L 0.554 / 0.552 / 0.553 / 0.45) and would be a one-token change, but it is
 * ALSO `--muted-foreground`'s value in light and sand, so the `none` band
 * would come out the weight of body ink and read as a FOURTH STATE — and it
 * would no longer match the `none` chip two inches to its right, which is a
 * worse defect than the one it fixes. A card must not unilaterally pick a
 * different neutral from the atom it shares a row with.
 * THE FIX BELONGS IN `index.css`: retune `--border` under `[data-theme=
 * 'contrast']` so it carries luminance contrast against `--surface-card`. That
 * repaints every card border in the app and is not this file's call.
 * The WORD "No valve installed" is unaffected and is, as always, the encoding
 * that actually carries the meaning (index.css:358-367).
 *
 * ── COPY RULES THIS CARD IS HELD TO ───────────────────────────────────────
 * From the private sandbox repo, which is the standard for this product:
 *   · HYPHENS IN UI COPY, NEVER EM-DASHES — `CLAUDE.md:268`, project-wide, and
 *     `docs/DESIGN-GUIDE-FOR-CLAUDE.md:49` "anywhere in UI strings". An
 *     `aria-label` IS a UI string: it is announced verbatim. Comments and this
 *     header are not UI copy and keep their em-dashes.
 *   · THOUSANDS SEPARATOR IS A COMMA (1,000) and WHOLE NUMBERS CARRY 0
 *     DECIMALS — `docs/wint-format-standards.md:24,27`. Every count on this
 *     card goes through `fmt()` below. NO PERCENTAGE IS DISPLAYED ANYWHERE and
 *     none should be added: the counts are the readout, and a percentage would
 *     be a second way to say the same thing that the ring already shows.
 *   · `No valve installed` is the blessed string for `sys.valve === null`.
 *     Do not re-spell it.
 *
 * OPEN QUESTION FOR THE OWNER, NOT DECIDED HERE: the sandbox `CLAUDE.md`
 * records a LOCKED widget title `Valve Status` (title case) for the PER-SYSTEM
 * valve widget, "not Valve Control". This card's `Header` renders `Valve
 * status` (sentence case). They are different surfaces and the lock names the
 * other one, so this was NOT changed unilaterally. If the two should agree,
 * that is a one-word edit in `Header` below.
 *
 * ── HOUSE RULES OBSERVED ─────────────────────────────────────────────────
 * NO PORTAL. `ValveConfirmSheet.jsx:17-25`: this app draws in a fixed 393x852
 * frame with `overflow: hidden` (`src/components/Phone.jsx`) and a Radix
 * portal escapes it by design. Nothing here portals — `<Separator>` is Radix
 * `Separator.Root`, which is inline, and `<Item asChild>` is `Slot.Root`.
 * NO `t()`. Only 2 of 36 v2 components use i18n and no v2 valve surface does.
 * NO NEW DEPENDENCIES.
 *
 * ── REPAINT — THREE INBOUND PATHS ────────────────────────────────────────
 * This card used to be the WRITER and PUBLISHED on three channels. It is the
 * LISTENER on the same three now, which is what "the readout updates after the
 * dedicated screen commits" actually requires:
 *   - `channel` message on `BroadcastChannel('pulse2-push')` — the same-tab /
 *     same-machine wake. The screen's channel object is a DIFFERENT object, so
 *     its `postMessage` does reach this one (`PushNotifications.jsx:102`).
 *     Precedent: `useDataRefresh.js:7,30-33`, `UserContext.jsx:47`.
 *   - the `storage` event — the CROSS-TAB wake, and the one that carries a
 *     cross-DEVICE push home: `pushBridge.publish` POSTs to ntfy.sh
 *     (`pushBridge.js:130`) and never touches the local channel, so a relayed
 *     command lands as a store write this listener hears.
 *   - `setTick` — this card's OWN state. `resolved` is a `useMemo` keyed on
 *     `[systems, tick]`, and a bare re-render would hand back the cached,
 *     pre-command resolution. `useDataRefresh()` cannot substitute: its tick is
 *     private to the hook, so it re-renders without invalidating that memo.
 *
 * ── PROPS ────────────────────────────────────────────────────────────────
 *   systems     Array of scoped systems. READ-ONLY — never mutated. Each is
 *               read only through `valveScope`, which wants
 *               `{ id, name, valve, comm | offline, lastSeen }`.
 *   scopeLabel  What the user sees in the header, e.g. "320 Summit Blvd" /
 *               "Acme Corp" / "All Accounts".
 *   className   Appended to the card shell.
 *   scopeKind   ACCEPTED AND DELIBERATELY UNREAD. `HomeAllAccounts.jsx:589`
 *               derives it ('location' | 'account') and it existed for one
 *               consumer: the confirm sheet's "Every system at this location"
 *               sentence. That sheet moved to the dedicated screen, which
 *               derives the same thing from the same route. It is not
 *               destructured below so it cannot be mistaken for live input.
 *
 * ── THE HEIGHT, MEASURED. ─────────────────────────────────────────────────
 * `scripts/shot.mjs` landed on 2026-11-03 and drives a real Chromium at the
 * real 393x852 frame, so every number in this block is a `boundingBox()` read
 * off the live page at the fleet scope (103 systems; error 2 · open 74 ·
 * closed 7 · none 20, one of the `none` systems offline and two of the `open`
 * ones). THESE ARE MEASUREMENTS. Do not replace them with class arithmetic.
 *
 *     ~520px   before the 2026-11-02 redesign          (64% of 808px usable)
 *      319.5   the SegmentedBar build, `b7749a8`       (40%)
 *      363.0   the donut restored, denominator kept    (45%)
 *      311.0   THIS BUILD, denominator deleted         (38%)
 *
 * THE RING COST 43.5px AND THE DENOMINATOR LINE PAID FOR IT, WITH CHANGE.
 * Taken in two steps, because they were two separate owner decisions:
 *   +43.5  the ring. Objection (a) in section 1b, never answered — only
 *          reduced. The 2x2 stat grid was 132px for four tiles; a 1-column
 *          legend of four 44px rows is 176px. The donut itself is free — at
 *          104px it is SHORTER than the legend beside it, so it adds no height
 *          at all, and the 10px bar it replaced is reclaimed.
 *          176 - 132 - 10 = +34, plus ~10px of flex centring and rounding.
 *   -52.0  the denominator line, deleted 2026-11-03: `mt-3` 12 plus two
 *          wrapped lines at `leading-5` 20. MEASURED, not summed: 363.0 →
 *          311.0.
 * NET 319.5 → 311.0, so the card with a donut on it is now SHORTER than the
 * SegmentedBar build it replaced, and 40% shorter than the ~520px original.
 * Objection (a) is, finally, answered outright rather than reduced.
 *
 * THE CHEAPEST REMAINING 60px, IF HEIGHT EVER MATTERS AGAIN: the full-width
 * "Manage valves" CTA, demoted to a small header action, reaches ~251px. That
 * is a product decision about the card's one control, not a layout decision,
 * so it is the owner's and it is not taken here.
 *
 * happy-dom has no layout engine — `getBoundingClientRect()` returns zeros —
 * so NOTHING in the tests asserts any of these numbers, and a test that
 * re-added the class values would only be checking that two files agree about
 * addition. Re-measure with the harness; do not re-derive.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Item } from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
/* `<ValveSwatch>` ONLY, and the atom sanctions it: "it is for places where the
   word is ALREADY on screen next to it in the caller's own markup — the chart
   legend, a filter-sheet option row." Both of this card's uses are exactly
   that — the legend row writes the word itself, and `SoloBody` has it in the
   sentence. `<ValveStateReadout>` would bring a second copy of the word and
   its own type scale into a row that has already set both. */
import { ValveSwatch } from '@/v2/components/ValveStateReadout'
import { VALVE_CATEGORIES, summariseValves } from '@/v2/components/valveScope'
import { effectiveValveState } from '@/data/valveCommandStore'

/* The same-tab wake. Module scope, one channel per module, exactly as
   `useDataRefresh.js:7` and `UserContext.jsx:47` do it. Guarded because the
   constructor does not exist in every environment this bundle is parsed in. */
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null

/* Every channel event that COULD mean the data layer moved. Copied from
   `useDataRefresh.js:27-29` rather than narrowed to 'data-changed': a
   cross-device push arriving through the ntfy bridge is relayed as its RAW
   type and never wrapped in a 'data-changed' envelope, so a narrower set is a
   readout that silently stops updating on exactly the path that needed it. */
const REFRESH_TYPES = new Set(['data-changed', 'push', 'demo-reset', 'actor-changed'])

/* ── The deep link ────────────────────────────────────────────────────────
   The query key the dedicated screen is expected to read. See THE DEEP LINK
   in the header: the one line to change if the screen disagrees. */
const STATE_PARAM = 'state'
const VALVES_ROUTE = '/valves'

/* The design's word for a category key. NOT a second `LABEL_OF` map — the old
   one was deleted with the rest of the local palette; this is a lookup into
   `VALVE_CATEGORIES`, which owns the vocabulary verbatim from Figma board
   199535:96542 (`Valve Error`, `Open`, `Closed`, `No valve installed`). The
   CHIP+WORD pair always comes from `<ValveStateReadout>`; this exists only for
   the two places that need the bare word inside a sentence. */
const labelOf = (key) => VALVE_CATEGORIES.find((c) => c.key === key)?.label ?? ''

/* Singular / plural without a formatter — there is no i18n on this surface and
   `Intl.PluralRules` for two English forms is ceremony. */
const plural = (n, one, many) => (n === 1 ? one : many)

/* THOUSANDS SEPARATOR IS A COMMA — `wint-format-standards.md:24`, "1,000".
   EVERY count this card renders goes through here, including the ones inside
   `aria-label`s, because a screen reader reads the string that is written.

   IT IS NOT COSMETIC AT THIS SCALE. The owner's framing for the feature is
   "shut off valve for around 1000 valve", so four-digit scopes are the design
   target rather than an edge case, and `1000 systems with a valve` beside
   `983 can be commanded` is exactly the pair of numbers this card exists to
   have compared at a glance.

   'en-US' is PINNED rather than left to the host locale: this surface has no
   i18n (no `t()` anywhere in the v2 valve stack) and a bare `toLocaleString()`
   would silently render `1.000` under a de-DE browser — which, next to a
   `0 decimals` house rule, reads as the number one. */
const fmt = (n) => Number(n).toLocaleString('en-US')

/* ── The donut's geometry ─────────────────────────────────────────────────
   All four numbers are in the svg's own user units (`viewBox="0 0 100 100"`)
   except DONUT_PX, which is the CSS size the svg is painted at. The only
   reason the two meet is GAP_UNITS: the brief asks for a 2px parting between
   adjacent arcs, 2px is a RENDERED measurement, and a user unit is
   DONUT_PX/100 of a rendered pixel — so the conversion has to happen here and
   is written out rather than folded into a magic number.

   RING_WIDTH 12 leaves an inner hole of 2*(40 - 6) = 68 user units = ~71px at
   104px, which is what the centre total and its word sit in. R 40 plus half
   the stroke is 46, so the ring clears the 100-unit box by 4 units on every
   side and nothing is clipped. */
const R = 40
const CIRCUMFERENCE = 2 * Math.PI * R
const RING_WIDTH = 12
const DONUT_PX = 104 /* must agree with `size-26` on the wrapper below */
const GAP_UNITS = 2 * (100 / DONUT_PX)

/* Stroke per ARC, as TOKEN UTILITIES — never an inline `style` or a hex,
   which is the defect the old local `FILL` map had (no theme can reach a style
   attribute, and a hex cannot follow a theme at all). Tailwind v4 generates
   `stroke-*` off the same `--color-*` namespace as `bg-*`, so these resolve
   from the `@theme inline` registration at `index.css:866-868`; see TOKENS,
   AND THE TRAP in the header for the browser check that confirmed it.

   Three keys, not four: `none` falls through to `ARC_HOLLOW`, a muted
   `--border` stroke, which is the same treatment `<ValveSwatch>` gives it.

   WHY THIS IS NOT IMPORTED FROM `ValveStateReadout`: that atom owns the CHIP,
   whose class map is `bg-*` and private on purpose — a `bg-` utility cannot
   paint an svg stroke. These name the same three tokens from the same
   registration, so the two cannot drift in COLOUR; if a fourth surface ever
   needs them, export a TOKEN map from the atom rather than writing a third
   copy of the utilities. */
const ARC_STROKE = {
  error: 'stroke-valve-error',
  open: 'stroke-valve-open',
  closed: 'stroke-valve-closed',
}
const ARC_HOLLOW = 'stroke-border'

/* react-router v6+ hands `useParams()` values back ALREADY DECODED, and
   `HomeAllAccounts.jsx:545` decodes again on top of that — harmless for every
   name in this dataset and the convention this page keeps, so it is kept here
   too so the two cannot disagree about what a route means. Guarded, which the
   page's version is not: `decodeURIComponent` THROWS on a lone '%', so a
   location named "50% Road" would take the card down rather than mis-link. */
function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * The management screen's URL for this scope, optionally pre-filtered.
 *
 * `/valves` unscoped, `/valves/:locationName` scoped — mirroring
 * `/location/:locationName`, and ENCODED THE SAME WAY, so "320 Summit Blvd"
 * round-trips as `320%20Summit%20Blvd` rather than breaking the path on its
 * spaces.
 */
function valvesHref(locationParam, categoryKey) {
  const base = locationParam
    ? `${VALVES_ROUTE}/${encodeURIComponent(safeDecode(locationParam))}`
    : VALVES_ROUTE
  return categoryKey ? `${base}?${STATE_PARAM}=${encodeURIComponent(categoryKey)}` : base
}

/**
 * ── The donut ────────────────────────────────────────────────────────────
 * One `<circle>` per non-empty category, sliced with `stroke-dasharray` and
 * positioned with `stroke-dashoffset`. NOT hand-rolled arc `<path>` data: a
 * dasharray is a fraction of the code and has no large-arc-flag to get wrong,
 * which is the class of bug the deleted implementation shipped.
 *
 * DECORATIVE, AND SAYS SO. `aria-hidden` + `pointer-events-none` on BOTH the
 * wrapper and the svg, because the legend beside it carries every number and
 * every word this could announce and a reader that saw both would read the
 * whole scope twice. The ring is not the control; the legend rows are, which
 * is objection (c) in the header answered rather than argued with.
 *
 * THE SCOPE TOTAL IS NOT LOST TO A READER by the centre figure being hidden:
 * the legend `<ul>` carries it in its `aria-label`, once, where it belongs.
 *
 * GEOMETRY — the whole rule, and the only place it bends:
 *   len     exactly (count / total) of the circumference. No floor, no
 *           minimum sweep, no debt redistribution. A 1-of-400 slice is 0.9
 *           degrees and very nearly invisible, and that is CORRECT.
 *   gap     min(GAP_UNITS, len / 2) — a 2px parting, reduced pro rata on a
 *           slice too small to give up 2px. A CAP ON A SUBTRACTION, never an
 *           addition: `drawn <= len` always, so no slice is ever drawn larger
 *           than its share. Inside the clamped regime proportionality is still
 *           exact, because every clamped slice draws at len/2.
 *   start   the exact cumulative fraction, plus half the gap. So the slice
 *           BOUNDARIES — the centres of the gaps — land on the true
 *           cumulative proportions however the gap is apportioned.
 *
 * `-rotate-90` turns 3 o'clock (where an svg circle's path begins) into 12
 * o'clock. It is applied to the whole square svg rather than to a `<g>` so the
 * rotation centre is the element's own centre and cannot drift from (50,50).
 * `strokeDashoffset` is NEGATIVE because a positive offset walks the pattern
 * backwards along the path.
 */
function Donut({ slices, total }) {
  const sum = slices.reduce((a, s) => a + s.count, 0) || 1

  /* `before` is re-summed per slice rather than carried in a mutable cursor:
     there are at most FOUR slices, and a running `let` reassigned inside a
     render callback is what `react-hooks/immutability` exists to stop. It also
     reads as the spec above — "the exact cumulative fraction" — instead of as
     an accumulator the reader has to simulate. */
  const arcs = slices.map((s, i) => {
    const before = slices.slice(0, i).reduce((a, x) => a + x.count, 0)
    const len = (s.count / sum) * CIRCUMFERENCE
    const gap = Math.min(GAP_UNITS, len / 2)
    return {
      key: s.key,
      count: s.count,
      drawn: len - gap,
      start: (before / sum) * CIRCUMFERENCE + gap / 2,
    }
  })

  return (
    <div
      data-name="valve-bar"
      aria-hidden="true"
      className="pointer-events-none relative size-26 shrink-0"
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
        data-name="valve-donut"
        className="pointer-events-none size-full -rotate-90"
      >
        {arcs.map((a) => (
          <circle
            key={a.key}
            data-valve-segment={a.key}
            data-valve-count={a.count}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth={RING_WIDTH}
            strokeLinecap="butt"
            strokeDasharray={`${a.drawn} ${CIRCUMFERENCE - a.drawn}`}
            strokeDashoffset={-a.start}
            className={ARC_STROKE[a.key] ?? ARC_HOLLOW}
          />
        ))}
      </svg>

      {/* The hero figure takes the font's PROPORTIONAL digits. `tabular-nums`
          is for a column a reader scans DOWN — the legend counts — and on a
          large standalone number equal-width digits only make it look loose.
          See THE SHADCN TELLS in the header. */}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-2xl font-semibold leading-none text-foreground">{fmt(total)}</span>
        <span className="text-xs leading-none text-muted-foreground">systems</span>
      </span>
    </div>
  )
}

/* ── One legend row ───────────────────────────────────────────────────────
   Swatch, the category WORD, the count, the per-category offline sub-count,
   and a chevron on the three that navigate. THE WHOLE ROW IS THE TARGET and it
   navigates: "Valve Error 2" lands on the two faulted ones rather than on a
   list to hunt through.

   THIS ROW IS THE ANSWER TO OBJECTION (c). The arcs were never meant to be
   targets and at a 361px card they cannot be — no arc reaches 44px radially in
   a ~14px ring band at any share. The row is `min-h-11` (44px), which is a
   SCALE step rather than a `min-h-[44px]` literal, and it is where every tap
   was always going to land. happy-dom cannot measure a target, so the class is
   what the test pins — as a rule ("at least 44px"), not as a string.

   THE COUNT INCLUDES THE OFFLINE SYSTEMS, by design: an offline system holds
   its last-known state and is genuinely part of the scope
   (`valveScope.js:53-59`). "How many of the OPEN valves are offline" is a
   cross-tab: a 2-D encoding would make the reader integrate it by eye, and as
   text it costs no height at all — `min-h-11` already reserves 44px for the
   target, and a one-line row simply centres inside it.

   THIS SUB-LINE IS NOW THE CARD'S ONLY OFFLINE ENCODING. The denominator line
   that used to restate the total was deleted on 2026-11-03 at the owner's
   instruction. Do not tighten this away as "already said below" — there is no
   longer a below.

   THE TRAILING SLOT IS FIXED-WIDTH AND ALWAYS PRESENT. `none` has no chevron
   but renders a `size-4` spacer in its place, so all four counts share one
   right edge and all three chevrons share another. That is the ragged-chevron
   defect of the 2x2 grid fixed by construction rather than by eye.

   `<Item asChild size="sm">` gives the chassis — `rounded-md`, the transparent
   border box, `transition-colors`, `text-sm` and the house focus ring. Only
   the size variant is overridden, because a two-line legend row stacks where a
   list row does not. See WHY NOT ItemGroup in the header. */
function LegendRow({ categoryKey, bucket, onOpen }) {
  const navigable = categoryKey !== 'none'
  const label = labelOf(categoryKey)
  const count = `${fmt(bucket.total)} ${plural(bucket.total, 'system', 'systems')}`

  const shell = cn(
    'w-full min-h-11 flex-col items-start justify-center gap-0 px-1 py-0 text-left',
    navigable ? 'cursor-pointer hover:bg-accent/50 active:bg-accent' : 'cursor-default',
  )

  return (
    <li className="min-w-0">
      <Item asChild size="sm" className={shell}>
        <button
          type="button"
          data-valve-row={categoryKey}
          /* `aria-disabled`, NOT the `disabled` attribute. A disabled control
             is skipped outright by some assistive tech, so the user never
             learns WHY it cannot be used — which on this row is the single
             most useful thing it has to say. It stays focusable and announced,
             with the reason inside its accessible name; the press handler is
             simply not wired. */
          aria-disabled={navigable ? undefined : 'true'}
          onClick={navigable ? () => onOpen(categoryKey) : undefined}
          /* THE OWNER'S APPROVED COPY, CARRIED OVER VERBATIM from the stat
             tile. The destination is named, because a chevron is a
             sighted-only promise, and the count stays in the name so the row
             still answers "how many" when it is read rather than seen. */
          aria-label={
            navigable
              ? `${label}: ${count}${bucket.offline > 0 ? `, ${bucket.offline} offline` : ''}. Manage these valves.`
              : `${label}, ${count}. Nothing to manage - there is no valve here to command.`
          }
        >
          <span className="flex w-full items-center gap-1.5">
            {/* THE ONE COLOUR CUE, AND THE WORD BESIDE IT IS MANDATORY.
                index.css:378-387: --valve-error against --valve-open is dE 7.6
                under deuteranopia, legal ONLY WITH SECONDARY ENCODING, and the
                WORD is that encoding. `<ValveSwatch>` rather than the full
                `<ValveStateReadout>` because this row writes the word itself,
                in its own type, right beside the chip — which is the exact
                condition that atom documents for exporting the chip alone. */}
            <ValveSwatch categoryKey={categoryKey} />
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm leading-5',
                navigable ? 'text-foreground' : 'text-muted-foreground',
              )}
              data-valve-label={categoryKey}
            >
              {label}
            </span>
            {/* `tabular-nums` here and NOT in the donut centre: these are four
                figures a reader scans DOWN a column, which is exactly what
                tabular figures are for. */}
            <span
              className={cn(
                'shrink-0 text-sm font-semibold leading-5 tabular-nums',
                navigable ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {fmt(bucket.total)}
            </span>
            {navigable ? (
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
                data-valve-chevron={categoryKey}
              />
            ) : (
              /* The reserved slot. See THE TRAILING SLOT above. */
              <span className="size-4 shrink-0" aria-hidden="true" />
            )}
          </span>
          {bucket.offline > 0 ? (
            /* Offline gets NO COLOUR of its own — muted ink, on its own line
               so the category word can never be truncated to make room for it.
               It is a reachability fact, not a valve state, and giving it a
               hue would file it under the same visual system as the three
               states. `pl-4` clears the swatch so it reads as a note on the
               row above it rather than a fifth category. */
            <span className="w-full truncate pl-4 text-sm leading-5 text-muted-foreground">
              {`· ${fmt(bucket.offline)} offline`}
            </span>
          ) : null}
        </button>
      </Item>
    </li>
  )
}

/* ── Chassis ──────────────────────────────────────────────────────────────
   The house card shell, shared verbatim with every sibling in the Home stack
   (`ActiveWaterEventsCard.jsx:501`, `EventsTimelineCard.jsx:296`,
   `InfoAccordion.jsx:139`). See WHY THE CHASSIS IS NOT `<Card>` in the header:
   `rounded-[18px]` and the absent shadow are the two arbitrary values kept on
   purpose, and only here.

   `w-full` AND NO INTRINSIC WIDTH, both pinned by
   `homeWidgetWidth.dom.test.jsx:80-82`: the Home stack is
   `flex flex-col items-start`, where a child without `w-full` sizes to its own
   content — which is how the consumption card came to RESIZE when the user
   changed its segment. A `w-[...]` here would beat `w-full` and reintroduce it.

   `px-6` — 24px, scale step 6 — on the header, the body AND the entry bar.
   That is the inset every sibling card uses, so the six cards' titles line up
   down the stack; a 16/24 mix is the "positions look broken" report. The stat
   tiles sit INSIDE that inset and carry their own `px-2`, which is the tile's
   padding, not a card inset. */
const CARD = String.raw`bg-surface-card border border-solid border-card content-stretch flex flex-col items-start overflow-hidden relative rounded-[18px] shrink-0 w-full`

function Header({ scopeLabel }) {
  return (
    <div
      className="flex w-full shrink-0 items-baseline justify-between gap-2 px-6 pb-2 pt-4"
      data-name="valve-header"
    >
      {/* NEW COPY. "Valve status" is the phrase this product already uses for
          a valve readout (`ValveStatusCard`'s own title), kept so the widget
          and the System page name the same thing the same way. */}
      <h3 className="text-sm font-semibold leading-5 text-foreground">Valve status</h3>
      {scopeLabel ? (
        <span className="min-w-0 truncate text-sm leading-5 text-muted-foreground">
          {scopeLabel}
        </span>
      ) : null}
    </div>
  )
}

/* ── One category, whole scope ────────────────────────────────────────────
   Every system in the same state. One series needs no legend — the sentence
   names it — so the tiles collapse to a line of prose and the grid is not
   drawn at all.

   The whole-scope-offline case lands here when it is also single-state, and it
   is drawn AT FULL COLOUR: last-known state is real information, and greying
   it out to signal unreachability is the bigger lie. The reachability line
   below says so in words instead.

   No deep link here: with one category the entry control at the foot of the
   card already lands on the only filter there is. `<ValveSwatch>` rather than
   `<ValveStateReadout>` because the word is already in the sentence beside it,
   which is exactly the condition that atom documents for exporting the chip
   alone. */
function SoloBody({ categoryKey, count, offline }) {
  return (
    <>
      <div className="mt-3 flex w-full items-center gap-2">
        <ValveSwatch categoryKey={categoryKey} />
        {/* NEW COPY. The headline as a SENTENCE, because with one series there
            is no legend to read a label against. */}
        <p className="min-w-0 flex-1 text-sm leading-5 text-foreground">
          {categoryKey === 'none'
            ? `All ${fmt(count)} ${plural(count, 'system is', 'systems are')} metering-only.`
            : `All ${fmt(count)} ${plural(count, 'system is', 'systems are')} ${labelOf(categoryKey)}.`}
        </p>
      </div>
      {offline > 0 ? (
        /* NEW COPY. Says the colour above is last-known, not live. */
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {`${fmt(offline)} of ${plural(count, 'it is', 'them are')} offline · last-known state shown`}
        </p>
      ) : null}
    </>
  )
}

/* ── The way in ───────────────────────────────────────────────────────────
   The card's one control, and the only thing on it that is not a readout.

   `<Button>` with the DEFAULT variant and the DEFAULT size — `h-9 px-4
   rounded-md`, straight off `button.jsx:49`, with nothing added but `w-full`.
   It is navigation now, not an actuation: `destructive` is reserved for the
   control that actually shuts water off, and that control is on the screen
   this opens. A destructive-red button that only changes route would habituate
   the user to the colour that matters.

   NEW COPY: "Manage valves" — awaiting the owner's approval like every other
   string on this card. */
function EntryBar({ onOpen }) {
  return (
    <div className="w-full shrink-0 px-6 py-3" data-name="valve-entry">
      <Button type="button" onClick={() => onOpen(null)} className="w-full" data-valve-entry="true">
        Manage valves
      </Button>
    </div>
  )
}

export default function ValveManagementCard({ systems = [], scopeLabel = '', className }) {
  const navigate = useNavigate()
  /* THE ROUTE IS THE SCOPE — `HomeAllAccounts.jsx:502-515` states that model
     for this whole page, so the card reads the scope off the route exactly as
     the page does rather than taking a handler prop. `scopeLabel` is
     deliberately NOT used to build the URL: on the unscoped routes it is the
     display string "All Accounts", which is not a location. */
  const { locationName } = useParams()

  const [tick, setTick] = useState(0)

  /* Repaint. See REPAINT in the header: three paths, all inbound now, and the
     tick is what invalidates the memo below. */
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const onMessage = (ev) => {
      if (ev?.data?.type && REFRESH_TYPES.has(ev.data.type)) bump()
    }
    const onStorage = (e) => {
      if (!e.key || e.key.startsWith('pulse2-')) bump()
    }
    channel?.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    return () => {
      channel?.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const openScreen = (categoryKey) => navigate(valvesHref(locationName, categoryKey))

  /* Commanded state wins over the system's own `valve`, resolved HERE rather
     than relied on from the caller: `valveScope.js:21-25` says in as many words
     that a caller wanting commanded state honoured resolves it FIRST and hands
     the resolved systems in — this is that call site. It matters MORE now that
     the write happens on another screen, or the readout would report
     pre-command state after the user came back. `systems` is never mutated:
     every entry is a fresh object. `tick` is in the deps so a write elsewhere
     re-resolves, and is read for no other reason. */
  const resolved = useMemo(() => {
    void tick
    return (Array.isArray(systems) ? systems : [])
      .filter((s) => !!s && typeof s === 'object')
      .map((s) => ({ ...s, valve: effectiveValveState(s) }))
  }, [systems, tick])

  const summary = useMemo(() => summariseValves(resolved), [resolved])

  /* ── State 1: nothing in scope. Render nothing at all. ────────────────── */
  if (summary.total === 0) return null

  /* `actionableTotal` and `offlineTotal` are DELIBERATELY NOT TAKEN. They had
     exactly one reader — the denominator line — and the owner deleted it on
     2026-11-03 (see THE DENOMINATOR LINE IS GONE in the header). They are
     still on `summary` and `valveScope.js` still computes them; leaving them
     destructured here would be two bound names nothing reads, which is how a
     deleted line grows a second life. `valveTotal` stays because the
     zero-valve state below is gated on it. */
  const { byCategory, valveTotal, total } = summary
  const rows = VALVE_CATEGORIES.filter((c) => byCategory[c.key].total > 0)

  /* ── State 2: systems, but ZERO valves anywhere. ──────────────────────── */
  if (valveTotal === 0) {
    return (
      <div className={cn(CARD, className)} data-name="valve-management">
        <Header scopeLabel={scopeLabel} />
        <div className="w-full px-6 pb-4" data-name="valve-body">
          {/* NEW COPY, both lines. One honest sentence and the scope count
              under it — NOT the deleted denominator line, which was a
              different string on the other branch and never rendered here:
              no ring of a single empty category, no legend, AND NO ENTRY
              CONTROL: there is nothing on the management screen for this scope
              to manage, so offering a way in would be a dead end with a
              chevron on it. Reachable from the live drawer today (Southbridge
              Health; 45 Cedarline Way, 510 Lakeview Dr, 30 Dogwood Dr), not an
              edge case. */}
          <p className="text-sm leading-5 text-foreground">No valves in this scope.</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {`All ${fmt(total)} ${plural(total, 'system is', 'systems are')} metering-only.`}
          </p>
        </div>
      </div>
    )
  }

  /* The arcs, in the design's order, filtered to the non-empty categories. A
     zero-count category gets NO ARC — it would be a zero-length dash, which is
     nothing, and `<circle>` would still be in the DOM claiming a slice that
     does not exist. The rule is the same one the legend follows: never invent
     a mark for a 0, and (now) never inflate a mark for a 1. */
  const slices = rows.map((c) => ({ key: c.key, count: byCategory[c.key].total }))

  /* Exactly one non-empty category: one series needs no legend, AND no ring.
     A part-to-whole of a single category is a 100% circle — it says nothing
     the sentence below does not say better, and it would be 104px of pure
     decoration on a card whose weakest dimension is its height. The
     `SegmentedBar` build drew a single full-width segment here; that mark is
     dropped with the bar itself. This is the same argument the n = 1 case
     already made, applied to one CATEGORY rather than one SYSTEM. */
  const soloKey = rows.length === 1 ? rows[0].key : null

  return (
    <div className={cn(CARD, className)} data-name="valve-management">
      <Header scopeLabel={scopeLabel} />

      <div className="w-full px-6 pb-4" data-name="valve-body">
        {soloKey ? (
          <SoloBody
            categoryKey={soloKey}
            count={byCategory[soloKey].total}
            offline={byCategory[soloKey].offline}
          />
        ) : (
          /* DONUT LEFT, LEGEND RIGHT. The body's inset leaves 313px: the
                ring takes 104 (`size-26`, `shrink-0`), `gap-3` takes 12, and
                the legend gets the remaining ~197 — enough that "No valve
                installed", the longest of the four design words, sets on one
                line without truncating. Verified in a browser, which is the
                only place that question can be answered.

                `items-center` because the legend (4 x 44px) is taller than the
                ring (104px): the ring centres against the column rather than
                hanging off its top edge.

                THE CHART IS STILL THE CONTROL — the ring is inert and the
                legend rows are the buttons. A <ul>/<li> rather than
                <ItemGroup>: that primitive is `role="list"`, and a <button>
                directly inside a role="list" is invalid. See WHY NOT ItemGroup
                in the header. */
          <div className="mt-3 flex w-full items-center gap-2" data-name="valve-chart">
            <Donut slices={slices} total={total} />

            {/* The scope total, once, for a reader — the donut's centre figure
                is `aria-hidden` with the rest of the ring, and the total
                appears in no other text on the card. */}
            <ul
              className="min-w-0 flex-1"
              data-name="valve-stats"
              aria-label={`Valve status across ${fmt(total)} ${plural(total, 'system', 'systems')}`}
            >
              {rows.map((c) => (
                <LegendRow
                  key={c.key}
                  categoryKey={c.key}
                  bucket={byCategory[c.key]}
                  onOpen={openScreen}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* The house `<Separator>` — Radix `Separator.Root`, inline, no portal —
          rather than a hand-rolled `border-t` div. */}
      <Separator />
      <EntryBar onOpen={openScreen} />
    </div>
  )
}
