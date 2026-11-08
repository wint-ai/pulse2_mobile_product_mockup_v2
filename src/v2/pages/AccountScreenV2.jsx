/**
 * Profile (/account) — the v2 port of src/screens/AccountScreen.jsx.
 *
 * ── THE TWO VIEWS ARE ONE SCREEN, 2026-11-04 ─────────────────────────────
 *
 * This file used to be "Account / More" and used to hold TWO views in local
 * state: `view === 'main'`, titled "More", and `view === 'profile'`, titled
 * "Personal Information", reached by tapping the persona card. The floating
 * tab bar grew a Profile item the same day and BOTH Profile and More pointed
 * at this one route, so the bar had two buttons opening one screen. The
 * owner, having raised it three times:
 *
 *   "Profile needs to open the user profile. More doesn't need to open the
 *    user profile - they are separate buttons... make the More navigate to /
 *    overlay a new screen which hides everything, but writes there Coming
 *    soon."
 *
 * So MORE moved out to its own route (/more, src/v2/pages/MoreComingSoonScreen
 * .jsx) and this screen became PROFILE, whole. The sub-view is gone: Personal
 * Information is the first card instead, which is what "Profile opens the user
 * profile" means - no extra tap, no back arrow, no second title.
 *
 * NOTHING LEFT THIS SCREEN. Rule 0 of .claude/skills/v2-page-parity/SKILL.md
 * ("working functionality is never removed without the owner's word") governs
 * the question of where the old 'main' content went, and the answer is that it
 * did not go anywhere. Every row is still here, in this order:
 *
 *   Personal Information (was the sub-view)     name · email · phone · role ·
 *                                               avatar · Sign out
 *   both-off notifications banner               moved from first to second
 *   Switch profile              -> /select      the only route to the picker
 *   My Scope                                    counts + the permission rows
 *   Users / Reports                             inert, `Coming soon` chips
 *   Personal Settings                           language · units · theme · bg
 *   Push Notifications / SMS Notifications      + the both-off confirm
 *   Tutorial                    -> /home-legacy replay onboarding
 *   app version
 *
 * TWO OF THOSE ARE ARGUABLY MORE'S AND ARE DELIBERATELY NOT MOVED. `Users` and
 * `Reports` are the "reports, users, etc" surface the owner described for
 * More, and they arrived here only this morning, at his request, from
 * WintSidebarV2's footer. They stay because the alternative is worse in both
 * directions: putting them on /more contradicts "hides everything, but writes
 * there Coming soon", and deleting them removes rows he asked for three times.
 * They are already honest - inert, chevron-less, badged `Coming soon` - so
 * they cost nothing where they are. MOVING THEM IS HIS CALL, not a tidy-up.
 *
 * ONE ROW LOST ITS JOB RATHER THAN ITS CONTENT: the persona card. It was a
 * button whose only destination was the Personal Information sub-view, and
 * with both on one screen it had nowhere left to go. Its avatar disc, name and
 * role are now the identity row at the top of that card; its email line is the
 * Email field two rows below. See the call site.
 *
 * DESIGN SOURCE: none. This screen has NO authoritative Figma node. The
 * delivery file (YEmjkKS4xaA827Zm8w3oXx) resolves the screen frames the other
 * v2 pages cite — `get_metadata 198314:73471` still returns the "All accounts"
 * frame — but the document's page listing exposes only the design-system pages
 * (Button, Card, Select, Sidebar, …) and carries no More/Account frame, and no
 * node id for one is cited anywhere in this repo or the sandbox. So the
 * INFORMATION ARCHITECTURE here is v1's, unchanged and section for section,
 * and only the styling mechanism moved onto the tokens in src/index.css.
 * **The layout is unverified against Figma.** When a node appears, re-derive
 * this file from it and put its id in this header.
 *
 * WHAT MOVED (v1 value -> v2 token/control). v1 carried 116 inline style
 * objects, two useTheme() reads and four Material Symbols ligatures; this file
 * has zero of each.
 *
 *   v1 literal                              v2
 *   ──────────────────────────────────────  ─────────────────────────────────
 *   theme.card / theme.cardBorder           the house chassis: bg-surface-card
 *                                           + border-card + rounded 18px, on
 *                                           the shadcn <Card> (same chassis as
 *                                           SystemTypeCard / ActivePolicyCard
 *                                           / ValveConfirmSheet). Both were a
 *                                           raw #fafbfc / border-white until
 *                                           Phase 4; --surface-card is
 *                                           declared by all four themes, so
 *                                           this card now follows them.
 *   GLOW_PAGE_BG + PipesHeader glow         var(--app-bg), the screen-root wash
 *                                           every other v2 page paints
 *   theme.text                              text-slate-900  (--foreground)
 *   theme.textSecondary                     text-slate-600
 *   theme.textTertiary / theme.textMuted    text-slate-500  (--muted-foreground)
 *   theme.textDimmest                       text-slate-400
 *   theme.separator                         <Separator> (bg-border, slate-200)
 *   #04ADEF  avatar disc                    bg-primary (wint-blue-accent)
 *   #34C6E5  toggle track, on               bg-primary
 *   #A1D246  "Yes" in the scope rows        text-success (--success #5C9E1A)
 *   #DB4670  banner text + modal header     the red ramp: text-red-600 on
 *                                           bg-red-100 for the banner,
 *                                           bg-destructive for the modal
 *                                           header and its confirm button.
 *                                           --severity-high is Wint's *High
 *                                           Flow Water Event* semantic, not a
 *                                           generic danger colour, so a
 *                                           notifications warning does not
 *                                           borrow it.
 *   THE PURPLE GRADIENT on Switch profile   gone. v1 painted
 *     linear-gradient(135deg,                 rgba(124,58,237,.12) ->
 *     rgba(124,58,237,.12),                    rgba(11,149,248,.10)
 *     rgba(11,149,248,.10)) + #7C3AED        with a #7C3AED disc, #7C3AED
 *     disc + chip + violet shadow            chip and a violet drop shadow.
 *                                           Violet is in NO token in
 *                                           src/index.css. The card is now
 *                                           bg-secondary (--secondary #f2f6ff,
 *                                           the design system's own accent
 *                                           surface) with border-primary/25,
 *                                           a bg-primary disc, and the shadcn
 *                                           <Badge> for the DEMO chip. It
 *                                           still reads as the one emphasised
 *                                           card on the screen — in the
 *                                           palette instead of beside it.
 *   Material Symbols swap_horiz / language  lucide-react ArrowLeftRight /
 *     / straighten / chevron_right          Globe / Ruler / ChevronRight. The
 *                                           emoji glyphs (👤 ✉ 📱 🔔 💬 🎓 🔕)
 *                                           go the same way. src/v2/icons/ has
 *                                           no equivalent for any of them and
 *                                           nothing new is added there for a
 *                                           glyph Lucide already covers.
 *   hand-rolled <Dropdown>                  <ToggleGroup type="single">, the
 *                                           shadcn segmented control. See
 *                                           WHY NOT A DROPDOWN below.
 *   hand-rolled iOS <Toggle>                the shadcn <Toggle> primitive,
 *                                           restyled as a switch track + knob,
 *                                           so the pressed state, the focus
 *                                           ring and the ARIA come from Radix
 *                                           rather than a click handler on a
 *                                           <div>.
 *   emoji ▾ / ‹ / × / ⓘ                     lucide ChevronRight / X / Info
 *
 * WHY NOT A DROPDOWN for Language and Measurement units. src/components/ui/
 * has no select or dropdown-menu, and both Radix primitives render their
 * content through a portal to document.body — which escapes the 393x852
 * Phone.jsx frame, exactly the bug being fixed below. The design system's
 * in-frame control for a small, fixed option set is the segmented
 * <ToggleGroup> (ActivePolicyCard uses one for Home/Away), and both of these
 * sets are small and fixed: two languages, three units. So both pickers are
 * real shadcn controls, both show every option without opening anything, and
 * neither leaves the frame. Nothing was hand-rolled to get there.
 *
 * TWO v1 DEFECTS FIXED
 *
 * 1. The confirm modal escaped the phone. v1 AccountScreen.jsx:437 opened it
 *    with `position: fixed; inset: 0`, which is positioned against the
 *    VIEWPORT, not the 393x852 frame — on desktop it greyed out the whole
 *    browser window with the phone sitting in the middle of it. It is now the
 *    house in-frame overlay: `absolute inset-0` + a scrim, as
 *    SystemsFilterSheet.jsx:97 and ValveConfirmSheet.jsx do. No Radix portal
 *    and no shadcn <Sheet> — both portal to document.body and would escape the
 *    frame the same way. The page root is `relative` so the overlay has
 *    something to pin to.
 *
 *    NOTE ON WHAT THIS MODAL IS. The audit called :434-481 the "sign-out
 *    confirm modal". It is not: it is the notifications confirm
 *    ("Disable all notifications?", more.both_off_modal.*) that fires when
 *    turning off the second of Push/SMS. Sign-out itself has never had a
 *    confirm step in v1 — it signs out on tap from Personal information — and
 *    that behaviour is carried over unchanged rather than a confirm being
 *    invented for it. (more.sign_out_confirm_title exists in the locale files
 *    and is unused in v1; it is still unused here.)
 *
 * 2. Replay onboarding was dead, and is now wired. v1:415 cleared
 *    `pulse2-onboarded`, set `pulse2-onboard-phase=home` and navigated to `/`
 *    — but `/` is HomeAllAccounts, a v2 page that never mounts <Onboarding>.
 *    The only two mounts are HomeManager (phase === 'home', HomeManager.jsx:203)
 *    and SystemsTab3 (SystemsTab3.jsx:452). HomeManager IS routed, at
 *    /home-legacy, so the row now navigates there: same two sessionStorage
 *    writes, a destination that actually renders the overlay. REMOVING the row
 *    was the other option and was rejected — the tour still exists and still
 *    runs, it was only being sent to a screen that had stopped carrying it, so
 *    deleting a working feature's only entry point would have been the
 *    functionality loss Rule 0 forbids.
 *
 * USERS AND REPORTS, added 2026-11-04. They were two inert rows in the
 * sidebar's footer (src/v2/components/WintSidebarV2.jsx), and the owner asked
 * three times for them to move here. They are rendered as INERT rows, not as
 * buttons - see the call site for the full argument. Nothing about their
 * presentation is new: each is the same single-row <Card> the Tutorial row
 * below already is, minus the chevron, plus the <Badge> this screen already
 * uses for the DEMO ONLY chip.
 *
 * EVERYTHING ELSE IS PARITY. Personal information (the persona card's data
 * folded in); Switch
 * profile -> /select; My Scope counts + Role/Valve control/Edit policies;
 * Language (incl. Hebrew + RTL) and Measurement units; Push and SMS with the
 * both-off banner and confirm; replay onboarding; app version; and every one
 * of v1's 37 distinct t() keys, with useTranslation kept. Nothing is
 * hardcoded English.
 *
 * SHELL CONTRACT (.claude/skills/v2-page-parity/SKILL.md): root is
 * flex-1/min-h-0/flex-col, exactly one child is flex-1/overflow-y-auto/min-h-0,
 * <TabBar activeTab="profile"> is a shrink-0 sibling — "profile" is the key
 * the Profile tab reports (TabBar.jsx). It was "account" until 2026-11-04,
 * which is why the MORE tab used to light up on this screen even when you
 * arrived by tapping Profile. No min-h-screen, no h-screen, no fixed.
 * This screen draws no burger: v1 had none and NavigationDrawer is not part of
 * its IA.
 *
 * CLASS-STRING RULE, same as every other v2 file: line-heights go LAST in a
 * cn() string. tailwind-merge treats `leading-*` as conflicting with a
 * font-size utility and silently drops a leading- that precedes one.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  Bell,
  BellOff,
  ChevronRight,
  FileChartColumn,
  Globe,
  GraduationCap,
  Info,
  Mail,
  MessageSquare,
  Palette,
  Ruler,
  Smartphone,
  User,
  Users,
  Wallpaper,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import TabBar from '@/components/TabBar'
import BackgroundPicker from '@/v2/components/BackgroundPicker'
import { useUserContext } from '@/context/UserContext'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { SELECTABLE_THEMES, getTheme, setTheme } from '@/theme'
import { SUPPORTED_BACKGROUNDS, getBackground, setBackground } from '@/theme/background'

/* The em dash v1 used for every empty field. Written as an escape so the file
   stays ASCII and cannot be mangled by a CRLF/encoding round-trip. */
const EMPTY = '—'

/* ── chassis ─────────────────────────────────────────────────────────────── */

/* The house card. Overrides on the shadcn <Card> rather than a new div so the
   next person edits one chassis, not two: gap/py/shadow are undone because
   each section owns its own internal rhythm. */
/* `shrink-0` is NOT decoration. The scroll container is a flex COLUMN, so
   every child is flex-shrink:1 by default and a column that overflows squashes
   its children to fit instead of scrolling — in the browser this rendered the
   persona card clipped mid-line, the scope card without its permission rows and
   the Push/SMS cards as empty headers, with scrollHeight === clientHeight and
   no scrollbar to show anything was missing. The Figma-ported cards get this
   from their exported `shrink-0`; a hand-built card has to say it.

   It is also spelled ONCE MORE, on the scroll container itself, as
   `[&>*]:shrink-0` — see SCROLL CONTAINER below. Relying on every child to
   remember a class is how this bug comes back: it only takes one new section
   added without it. The container rule makes the region immune by
   construction, and these per-child `shrink-0`s stay because they are what the
   reader sees first. */
const CARD =
  'shrink-0 gap-0 overflow-hidden rounded-[18px] border border-solid border-card bg-surface-card py-0 shadow-none'

const SECTION_TITLE =
  'px-4 pb-[6px] pt-[13px] font-bold tracking-[-0.2px] text-slate-900 text-[15px] leading-[20px]'

const ROW_LABEL = 'font-medium text-slate-900 text-[15px] leading-[20px]'
const ROW_ICON = 'size-[20px] shrink-0 text-slate-500'

/* The chip on a row whose destination does not exist yet. See the Users /
   Reports call site for why these rows are chips-and-no-chevron. */
const INERT_BADGE =
  'shrink-0 border-border bg-transparent px-[8px] py-[2px] font-medium text-slate-500 text-[11px] leading-[15px]'

function SectionTitle({ children }) {
  return <h2 className={SECTION_TITLE}>{children}</h2>
}

/* ── switch ──────────────────────────────────────────────────────────────── */

/**
 * The Push / SMS switch. v1 drew a 44x26 track with a 22px knob on a <div>
 * with an onClick — no role, no keyboard, no focus ring. This is the shadcn
 * <Toggle> (Radix Toggle) wearing the same geometry, so `aria-pressed`, Space
 * and Enter, and the design system's focus ring all come for free.
 *
 * The knob reads the ROOT's state through `group-data-[state=on]`, because the
 * data-state attribute lives on the button Radix renders, not on the span.
 * Track: --primary on, slate-400 off (v1's theme.textDimmest). The hover
 * overrides are not decoration — toggleVariants ships `hover:bg-muted`, which
 * would wash the track to slate-100 under the pointer.
 */
function NotificationSwitch({ on, onToggle, label }) {
  return (
    <Toggle
      pressed={on}
      onPressedChange={onToggle}
      aria-label={label}
      className={cn(
        'group h-[26px] w-[44px] min-w-0 shrink-0 cursor-pointer rounded-full p-0 transition-colors',
        'bg-slate-400 hover:bg-slate-400',
        'data-[state=on]:bg-primary data-[state=on]:hover:bg-primary',
      )}
    >
      <span
        aria-hidden="true"
        className="block size-[22px] -translate-x-[9px] rounded-full bg-card shadow-[0_1px_3px_rgba(15,23,43,0.18)] transition-transform group-data-[state=on]:translate-x-[9px]"
      />
    </Toggle>
  )
}

/* ── picker ──────────────────────────────────────────────────────────────── */

/**
 * The segmented picker both settings rows use. `grow basis-0 shrink` is what
 * makes the items share the width: ToggleGroupItem ships `shrink-0 w-auto`,
 * and `shrink` has to be spelled to put it back (twMerge drops the shrink-0,
 * but only because this class comes later in the same group).
 */
function SegmentedPicker({ value, options, onChange, label }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      /* Radix hands back '' when the pressed item is pressed again. A settings
         picker has no empty state, so that is ignored rather than stored. */
      onValueChange={(next) => { if (next) onChange(next) }}
      aria-label={label}
      className="w-full"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={cn(
            'h-[36px] min-w-0 shrink grow basis-0 cursor-pointer px-2',
            'font-medium text-slate-600 text-[14px] leading-[20px]',
            'data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:text-primary',
          )}
        >
          <span className="truncate">{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/* ── personal information ────────────────────────────────────────────────── */

/* `icon` is taken as a prop and re-bound to a capitalised local before use.
   This repo runs eslint WITHOUT eslint-plugin-react, so a bare <Icon /> in JSX
   is not counted as a reference to the parameter and no-unused-vars fires on
   it; varsIgnorePattern `^[A-Z_]` exempts the local. TabBar.jsx is lint-clean
   for the same reason. */
function ProfileField({ icon, label, value }) {
  const Icon = icon
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 font-medium text-slate-500 text-[13px] leading-[18px]">{label}</div>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-[16px] shrink-0 text-slate-400" aria-hidden="true" />
        <span className="truncate text-slate-900 text-[15px] leading-[20px]">{value}</span>
      </div>
    </div>
  )
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export default function AccountScreenV2() {
  const navigate = useNavigate()
  const { persona, setPersona, visibleSystems = [] } = useUserContext() || {}
  const { t, i18n } = useTranslation()

  const [pushOn, setPushOn] = useState(false)
  const [smsOn, setSmsOn] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [pendingToggle, setPendingToggle] = useState(null)

  /* The units choice is held as a stable KEY, not a localized label, so it
     keeps matching an option when the language flips. v1 did the same and the
     reason is worth keeping in sight. */
  const [unitsKey, setUnitsKey] = useState('liters')
  const unitsOptions = [
    { value: 'liters', label: t('more.units.liters') },
    { value: 'gallons', label: t('more.units.gallons') },
    { value: 'cubic_meters', label: t('more.units.cubic_meters') },
  ]

  const languageOptions = SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))
  const languageValue =
    (SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0]).code

  /* The theme is held as a stable KEY, exactly like the units above, and that
     is ALL React holds: no colour value ever enters component state. The
     colours live in the token sets in src/index.css and are selected by the
     data-theme attribute on <html>. (src/context/ThemeContext.jsx is the v1
     engine — a context full of colour values, and the reason v1 carries ~1,840
     inline styles. It is not used here and is not extended.)
     SELECTABLE_THEMES omits the diagnostic `contrast` theme, which is reachable
     only via ?theme=contrast. */
  const [themeKey, setThemeKey] = useState(getTheme)
  const themeOptions = SELECTABLE_THEMES.map((th) => ({ value: th.key, label: t(th.labelKey) }))

  /* The app background is the SECOND axis and is held exactly the same way:
     a stable key, never a colour. data-bg on <html> is orthogonal to
     data-theme — nine grounds across four themes is 36 cells, not 36 colour
     systems, because every option re-tints the theme's own wash rather than
     replacing it. `swatchVar` rides along because the picker paints each
     swatch with the very property the page root reads under that option. */
  const [backgroundKey, setBackgroundKey] = useState(getBackground)
  const backgroundOptions = SUPPORTED_BACKGROUNDS.map((bg) => ({
    value: bg.key,
    label: t(bg.labelKey),
    swatchVar: bg.swatchVar,
  }))

  function switchProfile() {
    setPersona(null)
    navigate('/select', { replace: true })
  }

  function handleToggle(which) {
    const nextPush = which === 'push' ? !pushOn : pushOn
    const nextSms = which === 'sms' ? !smsOn : smsOn
    if (!nextPush && !nextSms) {
      setPendingToggle(which)
      setShowWarning(true)
    } else if (which === 'push') {
      setPushOn(!pushOn)
    } else {
      setSmsOn(!smsOn)
    }
  }

  function confirmWarning() {
    if (pendingToggle === 'push') setPushOn(false)
    else setSmsOn(false)
    setShowWarning(false)
    setPendingToggle(null)
  }

  function cancelWarning() {
    setShowWarning(false)
    setPendingToggle(null)
  }

  /* Replay the tour. Both sessionStorage writes are v1's, verbatim; only the
     destination changed, from `/` (which no longer mounts Onboarding) to
     /home-legacy (HomeManager, which does). See defect 2 in the header. */
  function replayOnboarding() {
    try {
      sessionStorage.removeItem('pulse2-onboarded')
      sessionStorage.setItem('pulse2-onboard-phase', 'home')
    } catch { /* sessionStorage unavailable — the tour just will not replay */ }
    navigate('/home-legacy')
  }

  const bothOff = !pushOn && !smsOn

  const accountCount = new Set(visibleSystems.map((s) => s.account)).size
  const locationCount = new Set(visibleSystems.map((s) => s.l4 || s.l3).filter(Boolean)).size
  const scopeCounts = [
    { key: 'accounts', value: accountCount, label: t('more.scope_counts.accounts') },
    { key: 'locations', value: locationCount, label: t('more.scope_counts.locations') },
    { key: 'systems', value: visibleSystems.length, label: t('more.scope_counts.systems') },
  ]

  const initials = (persona?.name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    /* `relative` is load-bearing: it is what the confirm overlay below pins to,
       and it is why that overlay stays inside the 393x852 frame. */
    <div className="relative flex min-h-0 flex-1 flex-col bg-[image:var(--app-bg)]">
      {/* Chrome — shrink-0, outside the scroller.
          NO BACK BUTTON, and that is the 2026-11-04 change rather than an
          omission. This screen is a TAB DESTINATION, not a sub-page: it is
          where the Profile tab lands, so there is nothing to go back to. The
          back arrow existed only to leave the 'profile' sub-view, and that
          sub-view is gone — see THE TWO VIEWS ARE ONE SCREEN in the header.
          The title is `tabs.profile`, the same catalogue string the tab that
          opens this screen is labelled with, so the destination and the
          control that reaches it say the same word. */}
      <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
        <h1 className="min-w-0 flex-1 truncate text-center font-bold tracking-[-0.3px] text-slate-900 text-[18px] leading-[24px]">
          {t('tabs.profile')}
        </h1>
      </div>

      {/* SCROLL CONTAINER — the one scrolling region.
          `[&>*]:shrink-0` is the backstop for the squash bug described at
          CARD above: this is a flex column, so any direct child that does not
          say `shrink-0` is compressed to fit instead of making the region
          scroll, and `overflow-hidden` on the cards then eats the content that
          no longer fits. Setting it here means a section added later cannot
          reintroduce the bug by forgetting a class. Pinned by
          accountScreenV2.dom.test.jsx.

          NO `pb-[93px]` ANY MORE — 2026-11-08. TabBar's host reserves
          TAB_BAR_CLEARANCE of real column now (src/components/tabBarMetrics.js),
          so this region already ends above the pill at EVERY scroll offset,
          not just at the end of the list. Keeping the class as well would
          reserve the strip twice and leave ~186px of dead space. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[14px] pt-[10px] [&>*]:shrink-0">
        {/* PERSONAL INFORMATION IS FIRST, because this screen IS what the
            Profile tab opens. Until 2026-11-04 it was a SUB-VIEW behind a
            tap on the persona card — see THE TWO VIEWS ARE ONE SCREEN in
            the header for why that stopped being tenable.

            THE IDENTITY ROW AT THE TOP IS THE OLD PERSONA CARD, folded in
            rather than deleted. That card was a BUTTON whose only job was
            to open this one, so with both on a single screen it had no
            destination left; but it also carried the avatar disc, the
            name and the ROLE, and role appears nowhere else here except
            as a permission word inside My Scope. Everything it rendered
            survives except its email line, which sits two rows below it
            as a labelled field — a card printing the same address twice
            reads as a bug, not as thoroughness. */}
        <Card className={CARD}>
          <SectionTitle>{t('more.personal_information')}</SectionTitle>
          <div className="px-4 pb-4 pt-[6px]">
            <div className="flex items-center gap-3 pt-[2px]">
              <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[15px] leading-[20px]">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900 text-[15px] leading-[20px]">
                  {persona?.name || EMPTY}
                </span>
                <span className="mt-[1px] block truncate text-slate-400 text-[13px] leading-[17px]">
                  {persona?.role || EMPTY}
                </span>
              </span>
            </div>

            <Separator className="mt-[14px]" />
            <div className="flex gap-4 py-3">
              <ProfileField
                icon={User}
                label={t('more.profile_fields.first_name')}
                value={persona?.name?.split(' ')[0] || EMPTY}
              />
              <ProfileField
                icon={User}
                label={t('more.profile_fields.last_name')}
                value={persona?.name?.split(' ').slice(1).join(' ') || EMPTY}
              />
            </div>

            <Separator />
            <div className="py-3">
              <ProfileField icon={Mail} label={t('more.profile_fields.email')} value={persona?.email || EMPTY} />
            </div>

            <Separator />
            <div className="pb-[18px] pt-3">
              <ProfileField
                icon={Smartphone}
                label={t('more.profile_fields.phone_number')}
                value={persona?.phone || EMPTY}
              />
            </div>

            {/* Sign out. v1 signs out on tap with no confirm; that is carried
                over rather than a confirm step being invented here. */}
            <Button
              variant="ghost"
              onClick={switchProfile}
              className="w-full cursor-pointer font-semibold text-destructive hover:bg-red-100 hover:text-destructive text-[15px] leading-[20px]"
            >
              {t('more.sign_out')}
            </Button>
          </div>
        </Card>

        {/* Both-off banner. The ⓘ v1 drew was inert — cursor:pointer and no
            handler — so it is carried as the decoration it actually was,
            rather than promoted to a control that would still do nothing.

            IT SITS BELOW PERSONAL INFORMATION rather than at the very top
            of the screen, which is where it was while this was the "More"
            page. On a screen the user opened by tapping their own face,
            leading with a notifications warning buries the thing they
            asked for. It is still above the fold and still a live region. */}
        {bothOff ? (
          <div
            role="status"
            className="flex shrink-0 items-center justify-between gap-2 rounded-[18px] border border-solid border-red-400/40 bg-red-100 px-4 py-[10px]"
          >
            <span className="min-w-0 font-medium text-red-600 text-[14px] leading-[18px]">
              {t('more.both_off_warning')}
            </span>
            <Info className="size-[16px] shrink-0 text-red-600/70" aria-hidden="true" />
          </div>
        ) : null}

        {/* Switch profile. The demo banner — see THE PURPLE GRADIENT in the
            header for where its violet went. */}
        <button
          type="button"
          onClick={switchProfile}
          className="flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-[18px] border border-solid border-primary/25 bg-secondary px-4 py-[14px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ArrowLeftRight className="size-[20px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <Badge className="mb-[2px] rounded-[4px] px-[6px] py-[2px] font-extrabold uppercase tracking-[0.5px] text-[9px] leading-[12px]">
              {t('more.demo_only')}
            </Badge>
            <span className="block font-bold tracking-[-0.2px] text-slate-900 text-[15px] leading-[20px]">
              {t('more.switch_profile')}
            </span>
            {/* The copy carries a <strong> around the persona name, so it
                stays an HTML string exactly as v1 rendered it. */}
            <span
              className="mt-[2px] block text-slate-500 text-[12px] leading-[17px]"
              dangerouslySetInnerHTML={{
                __html: t('more.switch_profile_desc', { name: persona?.name || 'Wint demo' }),
              }}
            />
          </span>
          <ChevronRight className="size-[22px] shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
        </button>

        {/* My Scope */}
        <Card className={CARD}>
          <SectionTitle>{t('more.my_scope')}</SectionTitle>
          <div className="px-4 pb-[14px] pt-1">
            <div className="flex gap-4">
              {scopeCounts.map((c) => (
                <div key={c.key} className="min-w-0 text-center">
                  <div className="font-bold text-slate-900 text-[20px] leading-[26px]">{c.value}</div>
                  <div className="text-slate-500 text-[12px] leading-[16px]">{c.label}</div>
                </div>
              ))}
            </div>

            <Separator className="mt-[10px]" />
            <dl className="flex flex-col gap-1 pt-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 text-[14px] leading-[18px]">
                  {t('more.scope_permissions.role')}
                </dt>
                <dd className="min-w-0 truncate font-semibold text-slate-900 text-[14px] leading-[18px]">
                  {t('more.scope_permissions.full_access')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 text-[14px] leading-[18px]">
                  {t('more.scope_permissions.valve_control')}
                </dt>
                <dd className="min-w-0 truncate font-semibold text-success text-[14px] leading-[18px]">
                  {t('common.yes')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 text-[14px] leading-[18px]">
                  {t('more.scope_permissions.edit_policies')}
                </dt>
                <dd className="min-w-0 truncate font-semibold text-success text-[14px] leading-[18px]">
                  {t('common.yes')}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        {/* Users and Reports — moved off the sidebar's footer, 2026-11-04,
            at the owner's request.

            NEITHER HAS A DESTINATION AND ONE IS NOT INVENTED HERE.
            Neither has a PRD or a designed screen, and §0 of
            .claude/skills/wint-ui-copy/SKILL.md forbids authoring what the
            catalogue does not have. So they are honest rather than fake:

              · a <div>, not a <button> - there is nothing to press;
              · NO ChevronRight. On this screen the chevron is the "this
                opens something" affordance (Switch profile, the persona
                card, Tutorial all carry it). A row that wears it and does
                nothing is worse than a row that says it is not here yet;
              · the <Badge> this screen already uses for the DEMO ONLY chip
                sits in the slot the chevron would have taken, carrying the
                status in words;
              · aria-disabled, not the `disabled` attribute: the REASON a
                control is unavailable has to reach a screen reader, and
                `disabled` is skipped outright by some of them. The long
                form of that argument is at
                src/v2/components/SlideToConfirm.jsx:152, and the sidebar
                rows these replace were aria-disabled too.

            Two cards rather than one card with a divider, because that is
            what this screen already does with two rows of the same kind -
            Push Notifications and SMS Notifications are two cards, not one.

            COPY. `Users` and `Reports` are the sidebar's own strings,
            carried over verbatim and keyed so this screen stays fully
            translated like the rest of it. NEW COPY: `more.coming_soon`.
            The words are lifted verbatim from the one place this repo
            already says this - src/screens/kpi/KPIDetailScreen.jsx:300 -
            rather than authored, but the key is new and is awaiting the
            owner's approval. */}
        <Card className={CARD}>
          <div
            aria-disabled="true"
            className="flex w-full items-center gap-[10px] px-4 py-[13px]"
          >
            <Users className={ROW_ICON} aria-hidden="true" />
            <span className={cn('min-w-0 flex-1 truncate', ROW_LABEL)}>{t('more.users')}</span>
            <Badge variant="outline" className={INERT_BADGE}>{t('more.coming_soon')}</Badge>
          </div>
        </Card>

        <Card className={CARD}>
          <div
            aria-disabled="true"
            className="flex w-full items-center gap-[10px] px-4 py-[13px]"
          >
            <FileChartColumn className={ROW_ICON} aria-hidden="true" />
            <span className={cn('min-w-0 flex-1 truncate', ROW_LABEL)}>{t('more.reports')}</span>
            <Badge variant="outline" className={INERT_BADGE}>{t('more.coming_soon')}</Badge>
          </div>
        </Card>

        {/* Personal settings — language + units */}
        <Card className={CARD}>
          <SectionTitle>{t('more.personal_settings')}</SectionTitle>
          <div className="px-4 pb-[14px] pt-1">
            <div className="py-[10px]">
              <div className="mb-2 flex items-center gap-[10px]">
                <Globe className={ROW_ICON} aria-hidden="true" />
                <span className={ROW_LABEL}>{t('more.language')}</span>
              </div>
              <SegmentedPicker
                label={t('more.language')}
                value={languageValue}
                options={languageOptions}
                onChange={(code) => i18n.changeLanguage(code)}
              />
            </div>

            <Separator />

            <div className="pt-[10px]">
              <div className="mb-2 flex items-center gap-[10px]">
                <Ruler className={ROW_ICON} aria-hidden="true" />
                <span className={ROW_LABEL}>{t('more.measurement_units')}</span>
              </div>
              <SegmentedPicker
                label={t('more.measurement_units')}
                value={unitsKey}
                options={unitsOptions}
                onChange={setUnitsKey}
              />
            </div>

            <Separator />

            {/* Theme. WHY A SEGMENTED PICKER AND NOT A DROPDOWN — three
                options in a settings row looks like it wants a shadcn
                <Select> or <DropdownMenu>. It cannot be one. Those are
                Radix primitives that portal to document.body, and this app
                draws inside the fixed 393x852 frame in
                src/components/Phone.jsx with overflow:hidden — a portal
                escapes that frame by design and renders across the whole
                browser window with the phone sitting in the middle of it.
                This repo has hit that at least three times; the lesson is
                written out in full at src/v2/components/ValveConfirmSheet.jsx:17-24
                and worked around at SystemsFilterSheet.jsx:97.
                SegmentedPicker is an inline ToggleGroup and never portals.
                Do not "improve" this into a dropdown. */}
            <div className="pt-[10px]">
              <div className="mb-2 flex items-center gap-[10px]">
                <Palette className={ROW_ICON} aria-hidden="true" />
                <span className={ROW_LABEL}>{t('more.theme')}</span>
              </div>
              <SegmentedPicker
                label={t('more.theme')}
                value={themeKey}
                options={themeOptions}
                onChange={(key) => { setThemeKey(setTheme(key)) }}
              />
            </div>

            <Separator />

            {/* App background. The SAME argument against a dropdown applies
                here and then some — nine options would be nine portalled
                rows escaping the phone frame — but the segmented row the
                three rows above use is out too: nine equal columns inside
                this card is 38px each and every label truncates to two
                characters. It is a swatch grid instead, and the long form
                of that reasoning is at the top of BackgroundPicker.jsx.
                The short form: the thing being chosen is a colour, so the
                control shows the colours. */}
            <div className="pt-[10px]">
              <div className="mb-2 flex items-center gap-[10px]">
                <Wallpaper className={ROW_ICON} aria-hidden="true" />
                <span className={ROW_LABEL}>{t('more.background')}</span>
              </div>
              <BackgroundPicker
                label={t('more.background')}
                value={backgroundKey}
                options={backgroundOptions}
                onChange={(key) => { setBackgroundKey(setBackground(key)) }}
              />
            </div>
          </div>
        </Card>

        {/* Push notifications */}
        <Card className={CARD}>
          <SectionTitle>{t('more.push_notifications_section')}</SectionTitle>
          <div className="flex items-center justify-between gap-3 px-4 pb-[14px] pt-2">
            <div className="flex min-w-0 items-center gap-[10px]">
              <Bell className={ROW_ICON} aria-hidden="true" />
              <span className={ROW_LABEL}>{t('more.push')}</span>
            </div>
            <NotificationSwitch on={pushOn} onToggle={() => handleToggle('push')} label={t('more.push')} />
          </div>
        </Card>

        {/* SMS notifications */}
        <Card className={CARD}>
          <SectionTitle>{t('more.sms_notifications_section')}</SectionTitle>
          <div className="flex items-center justify-between gap-3 px-4 pb-[14px] pt-2">
            <div className="flex min-w-0 items-center gap-[10px]">
              <MessageSquare className={ROW_ICON} aria-hidden="true" />
              <span className={ROW_LABEL}>{t('more.sms')}</span>
            </div>
            <NotificationSwitch on={smsOn} onToggle={() => handleToggle('sms')} label={t('more.sms')} />
          </div>
        </Card>

        {/* Replay the tour */}
        <Card className={CARD}>
          <button
            type="button"
            onClick={replayOnboarding}
            className="flex w-full cursor-pointer items-center gap-[10px] px-4 py-[13px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <GraduationCap className={ROW_ICON} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className={cn('block', ROW_LABEL)}>{t('more.tutorial')}</span>
              <span className="mt-[1px] block text-slate-500 text-[13px] leading-[17px]">
                {t('more.tutorial_desc')}
              </span>
            </span>
            <ChevronRight className="size-[18px] shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
          </button>
        </Card>

        <p className="shrink-0 px-4 pb-2 pt-1 text-center text-slate-400 text-[13px] leading-[17px]">
          {t('more.app_version', { version: '1.2.0' })}
        </p>
      </div>

      {/* Confirm: turning off the second of Push/SMS.
          IN-FRAME overlay — `absolute inset-0` against the page root, NOT
          `position: fixed` against the viewport, and not a portal. This is the
          defect described at the top of the file. */}
      {showWarning ? (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t('more.both_off_modal.title')}
        >
          <button
            type="button"
            aria-label={t('common.cancel')}
            onClick={cancelWarning}
            className="absolute inset-0 cursor-default bg-foreground/60"
          />

          <div className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] bg-card shadow-[0_8px_32px_rgba(15,23,43,0.4)]">
            <div className="bg-destructive px-6 pb-5 pt-7 text-center text-destructive-foreground">
              <span className="mb-[14px] inline-flex size-[52px] items-center justify-center rounded-[14px] bg-foreground/15">
                <BellOff className="size-[26px]" aria-hidden="true" />
              </span>
              <h2 className="mb-2 font-bold text-[18px] leading-[24px]">
                {t('more.both_off_modal.title')}
              </h2>
              <p className="opacity-90 text-[15px] leading-[22px]">{t('more.both_off_modal.body')}</p>
            </div>

            <div className="flex gap-3 px-5 pb-5 pt-4">
              <Button
                variant="secondary"
                onClick={cancelWarning}
                className="h-[44px] flex-1 cursor-pointer rounded-[10px] font-semibold text-[15px] leading-[20px]"
              >
                {t('more.both_off_modal.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmWarning}
                className="h-[44px] flex-1 cursor-pointer rounded-[10px] font-semibold text-[15px] leading-[20px]"
              >
                {t('more.both_off_modal.disable_all')}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('common.close')}
              onClick={cancelWarning}
              className="absolute end-3 top-3 cursor-pointer rounded-full bg-card/15 text-destructive-foreground hover:bg-card/25 hover:text-destructive-foreground"
            >
              <X className="size-[16px]" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* "profile", not "account". This screen is the PROFILE tab's
          destination now; the More tab has its own route (/more) and its own
          key. Passing "account" was what lit MORE even when you arrived by
          tapping Profile — see TabBar.jsx, THE COLLISION IS RESOLVED. */}
      <TabBar activeTab="profile" />
    </div>
  )
}
