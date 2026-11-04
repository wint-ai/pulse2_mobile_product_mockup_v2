---
name: wint-ui-copy
description: >-
  Rules for every string that reaches a user's screen in the Pulse 2 mobile app
  — labels, buttons, empty states, aria-labels, confirm sheets, error text,
  counts, dates and durations. Load BEFORE writing or editing any UI string,
  and before reviewing a diff that touches one. Encodes the project's own
  binding copy rules (hyphens not em-dashes, locked strings, "never invent a
  state label") plus the two writing standards the owner adopted on 2026-11-03:
  ASD-STE100 Simplified Technical English on surfaces where water actually
  stops or starts, and the Microsoft Writing Style Guide everywhere else.
---

# Wint UI copy

Every string here is read by a facility manager who may be deciding whether to
shut water off in an occupied building. This file is the standard for all of
them.

**Scope: strings that RENDER OR ARE ANNOUNCED.** JSX text, string literals that
reach the DOM, `aria-label`, `aria-describedby` targets, `alt`, toast and sheet
copy, button labels, empty states. **Code comments and file headers are NOT UI
copy** and are explicitly out of scope — do not "fix" an em-dash in a comment.

---

## 0 · Rule 0 — do not invent strings

`pulse2_mobile_product_sandbox/CLAUDE.md:247`: *"The catalogue is the source of
truth — never invent new state labels in the mockup."*

Notification copy is governed verbatim by `docs/Notification IDs -V11.0.xlsx`.
Valve state words come from `VALVE_CATEGORIES` in `src/v2/components/valveScope.js`.
Figma copy is transcribed literally, never authored.

When no approved string exists, **propose options to the owner rather than
picking one**, and mark new copy in the code so the next person knows it is
awaiting approval. The repo's existing convention is a `NEW COPY` comment.

---

## 1 · The binding project rules (these are not negotiable and predate this file)

| Rule | Source |
|---|---|
| **Hyphens in UI copy, never em-dashes.** `-`, never `—`. | `sandbox/CLAUDE.md:268`, `docs/DESIGN-GUIDE-FOR-CLAUDE.md:49` |
| App identity is **`Wint`** — never "Wint Pulse" or "WINT Pulse". | `sandbox/CLAUDE.md:82` |
| **"Water Event"** title-case in UI labels; lowercase "water event" inside V11 notification prose. | design guide |
| Valve widget title is **`Valve Status`**, not "Valve Control". | `sandbox/CLAUDE.md`, valve section |
| **`No valve installed`** is the blessed string for `sys.valve === null`. | same |
| Valve error pattern: **`Valve Error - flow detected while closed`** (note the hyphen). | same |
| System page tabs are **System · Policy · Timeline · Info** — never "Overview"/"Activity" in user-facing text. | `sandbox/CLAUDE.md` |
| Bottom tab is **Alerts** (reverted from "Attention" 2026-06-08). | `sandbox/CLAUDE.md` |

> **Known conflict, unresolved.** `docs/wint-format-standards.md` says
> *"Null = — (em dash)"*, which contradicts the project-wide hyphens rule.
> Read it narrowly: the em-dash is permitted **only as the empty-value glyph in
> a data cell**, never as sentence punctuation. If you need it any other way,
> ask the owner.

---

## 2 · Formats — `docs/wint-format-standards.md`

**Dates.** 24-hour clock always. Named months only, never `DD/MM/YYYY`.

| Where | Form |
|---|---|
| Alerts / cards | `Mar 4 · 14:35` (no year, middle-dot separator) |
| Tables with time | `Mar 4, 2026 · 14:35` |
| Tooltip / tap | `Mar 4, 2026 14:35:07` |
| KPI, chart day axis | `Mar 4` |
| Chart hour axis | `14:35` |

**Relative time is banned past one minute.** Under 1 min → `Just now`. One
minute or more → **an absolute date and time**. Never `2h ago`, never `3 days
ago`. (`src/utils/format.js` `formatLastSeen()` is compliant — it returns
`Today 14:35` / `Yesterday 14:35` / `Mar 4, 14:35`. Its comma deviates from the
middle-dot card format above; left alone deliberately because it has many
callers. Do not "improve" it into a relative form.)

**Duration.** `Xd Xh Xm`, zero segments omitted. Seconds only under one minute: `45s`.

**Numbers.** Comma thousands separator — `1,000`, not `1000`. This is live:
the owner's framing for bulk valve control is *"around 1000 valve"*. Use
`toLocaleString('en-US')`. Whole numbers carry no decimals (`600`, not `600.0`).
K/M shortening on mobile alerts, KPIs and chart axes; full values in tables and
tooltips.

---

## 3 · The two registers (adopted 2026-11-03 by the owner)

The owner chose a hybrid, for a reason this product already encodes elsewhere:
**danger attaches to context, not to the verb.** Copy follows the same split.

### 3a · DANGER REGISTER — ASD-STE100 Simplified Technical English

Use on any surface where **water actually stops or starts**, or where an alarm
is suppressed:

- `BulkValveConfirmSheet.jsx` — the whole sheet, the countdown, the forced
  acknowledgement, the result banner
- `ValveConfirmSheet.jsx` — per-system open/close confirm
- the Ignore flow's final step
- opening a valve during a live water event
- any copy stating what will NOT happen (offline exclusions)

Rules, from the ASD-STE100 specification:

1. **Max 20 words per sentence** (10 for an instruction). One topic per sentence.
2. **One instruction per sentence.** Never chain two actions with "and".
3. **Active voice.** "This closes 31 valves", not "31 valves will be closed".
4. **One word, one meaning. No synonyms.** Pick `close` and never also say
   `shut off`, `stop`, `kill`. Pick `offline` and never also say
   `unreachable`, `disconnected`, `not responding`.
5. **No contractions** in this register. `cannot`, not `can't`.
6. **State the consequence as a fact, in its own sentence.**
   `Water stops at these 31 systems.`
7. **Name what is excluded, and why, as a separate sentence.**
   `4 systems are offline. They do not change.`

Worked example — the bulk close sheet:

> This closes 31 valves.
> Water stops at these 31 systems.
> 4 systems are offline. Their valves do not change.

### 3b · EVERYDAY REGISTER — Microsoft Writing Style Guide

Everywhere else: readouts, lists, filters, empty states, navigation, headers,
the valve status card, the management list.

1. **Sentence case** for everything except proper nouns and the locked strings
   in §1. Not Title Case On Buttons.
2. **Second person, active voice.** "You have 20 selected."
3. **Contractions are fine and preferred** — `don't`, `can't`, `there's`.
4. **Never "please". Never blame the user.** No "invalid", no "illegal".
5. **Name a button for its outcome**, never `OK` / `Submit` / `Yes`.
   `Manage valves`, `Keep monitoring`, `Show 40 more`.
6. **Errors say what happened AND what to do next.** One without the other is
   half an error message.
7. **Digits always**, even under ten — `3 offline`, not `three offline`.
8. **Lead with the information, not the apology.**

Worked example:

> None of these 20 systems has a valve, so there's nothing to open or close.

---

## 4 · Counts, which this app gets wrong easily

- **The number on a control is what that control will DO**, never what is
  selected. When they differ, say so on the face of the UI before the confirm
  sheet — not only inside it.
- **Say what is not shown.** A truncated list states its truncation
  (`Showing 40 of 103`); a silent cut reads as "this is everything".
- **Never let two counts abut in `textContent`.** `2` followed by
  `3 systems with a valve` reads as `23` to any regex, and to a screen reader
  in some modes. Separate them with a `data-name` hook or real punctuation.
- Singular and plural both get written. `1 system`, `2 systems`.

---

## 5 · Accessibility is copy

`aria-label` is UI copy and obeys every rule above.

- A sighted-only affordance (a chevron, a colour) must have its meaning in the
  accessible name. A chevron is a promise; name the destination.
- **Colour is never the only cue.** `--valve-error` against `--valve-open` is
  ΔE 7.6 under deuteranopia (`src/index.css:358-367`) — legal *only* with
  secondary encoding, and the WORD is that encoding. There is no prop that
  removes it.
- Prefer `aria-disabled` over `disabled` when the user needs to learn WHY a
  control is unavailable — `disabled` is skipped outright by some assistive
  tech, so the reason never reaches them.

---

## 6 · Checklist before you call a string done

- [ ] No `—` anywhere it renders or is announced (comments are exempt).
- [ ] Right register for the surface: does this string stop water? (§3a) Or not? (§3b)
- [ ] One word, one meaning — grep the surface for a synonym of the verb you used.
- [ ] Counts use `toLocaleString`; singular and plural both exist.
- [ ] Dates absolute past one minute; 24-hour; named month.
- [ ] Button named for its outcome.
- [ ] If the string is new and not from a catalogue: marked `NEW COPY` and
      raised with the owner rather than quietly shipped.

## Sources

Binding, in-repo: `pulse2_mobile_product_sandbox/CLAUDE.md`,
`docs/DESIGN-GUIDE-FOR-CLAUDE.md` (marked obsolete for its source-of-truth
rules; its copy rules still stand and are restated in CLAUDE.md),
`docs/wint-format-standards.md`.

External, adopted 2026-11-03: **ASD-STE100** Simplified Technical English
(AeroSpace and Defence Industries Association of Europe) for the danger
register; **Microsoft Writing Style Guide** for the everyday register, itself
aligned to **ISO 24495-1:2023** *Plain language — Part 1*.
