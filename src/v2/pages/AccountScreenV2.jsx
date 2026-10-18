/**
 * Account / "More" — the v2 port of src/screens/AccountScreen.jsx.
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
 *   theme.card / theme.cardBorder           the house chassis: bg-[#fafbfc] +
 *                                           border-white + rounded 18px, on
 *                                           the shadcn <Card> (same chassis as
 *                                           SystemTypeCard / ActivePolicyCard
 *                                           / ValveConfirmSheet). #fafbfc is
 *                                           the one raw hex here: it is the
 *                                           house surface and the canvas
 *                                           exposes no token for it — see the
 *                                           TOKENS note in ValveConfirmSheet.
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
 * EVERYTHING ELSE IS PARITY. Persona card -> Personal information; Switch
 * profile -> /select; My Scope counts + Role/Valve control/Edit policies;
 * Language (incl. Hebrew + RTL) and Measurement units; Push and SMS with the
 * both-off banner and confirm; replay onboarding; app version; and every one
 * of v1's 37 distinct t() keys, with useTranslation kept. Nothing is
 * hardcoded English.
 *
 * SHELL CONTRACT (.claude/skills/v2-page-parity/SKILL.md): root is
 * flex-1/min-h-0/flex-col, exactly one child is flex-1/overflow-y-auto/min-h-0,
 * <TabBar activeTab="account"> is a shrink-0 sibling — "account" is the key
 * the More tab reports (TabBar.jsx). No min-h-screen, no h-screen, no fixed.
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
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  BellOff,
  ChevronRight,
  Globe,
  GraduationCap,
  Info,
  Mail,
  MessageSquare,
  Ruler,
  Smartphone,
  User,
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
import { useUserContext } from '@/context/UserContext'
import { SUPPORTED_LANGUAGES } from '@/i18n'

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
  'shrink-0 gap-0 overflow-hidden rounded-[var(--rounded-2xl,18px)] border border-solid border-white bg-[#fafbfc] py-0 shadow-none'

const SECTION_TITLE =
  'px-4 pb-[6px] pt-[13px] font-bold tracking-[-0.2px] text-slate-900 text-[15px] leading-[20px]'

const ROW_LABEL = 'font-medium text-slate-900 text-[15px] leading-[20px]'
const ROW_ICON = 'size-[20px] shrink-0 text-slate-500'

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
        className="block size-[22px] -translate-x-[9px] rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,43,0.18)] transition-transform group-data-[state=on]:translate-x-[9px]"
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

  const [view, setView] = useState('main')
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
  const profileView = view === 'profile'

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
      {/* Chrome — shrink-0, outside the scroller. */}
      <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
        {profileView ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('common.back')}
            onClick={() => setView('main')}
            className="shrink-0 cursor-pointer text-slate-900 rtl:rotate-180"
          >
            <ArrowLeft className="size-[18px]" />
          </Button>
        ) : null}
        <h1
          className={cn(
            'min-w-0 flex-1 truncate font-bold tracking-[-0.3px] text-slate-900 text-[18px] leading-[24px]',
            profileView ? 'text-start' : 'text-center',
          )}
        >
          {profileView ? t('more.personal_information') : t('more.title')}
        </h1>
        {/* Balances the back button so the title stays optically centred on
            the main view and left-aligned on the sub-view. */}
        {profileView ? <div className="size-8 shrink-0" aria-hidden="true" /> : null}
      </div>

      {/* SCROLL CONTAINER — the one scrolling region.
          `[&>*]:shrink-0` is the backstop for the squash bug described at
          CARD above: this is a flex column, so any direct child that does not
          say `shrink-0` is compressed to fit instead of making the region
          scroll, and `overflow-hidden` on the cards then eats the content that
          no longer fits. Setting it here means a section added later cannot
          reintroduce the bug by forgetting a class. Pinned by
          accountScreenV2.dom.test.jsx. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[14px] pb-8 pt-[10px] [&>*]:shrink-0">
        {profileView ? (
          <Card className={CARD}>
            <SectionTitle>{t('more.personal_information')}</SectionTitle>
            <div className="px-4 pb-4 pt-[6px]">
              <div className="mb-[14px] flex gap-4">
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
        ) : (
          <>
            {/* Both-off banner. The ⓘ v1 drew was inert — cursor:pointer and no
                handler — so it is carried as the decoration it actually was,
                rather than promoted to a control that would still do nothing. */}
            {bothOff ? (
              <div
                role="status"
                className="flex shrink-0 items-center justify-between gap-2 rounded-[var(--rounded-2xl,18px)] border border-solid border-red-400/40 bg-red-100 px-4 py-[10px]"
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
              className="flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-[var(--rounded-2xl,18px)] border border-solid border-primary/25 bg-secondary px-4 py-[14px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

            {/* Persona card -> Personal information */}
            <Card className={CARD}>
              <button
                type="button"
                onClick={() => setView('profile')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-[14px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[15px] leading-[20px]">
                  {initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900 text-[15px] leading-[20px]">
                    {persona?.name || EMPTY}
                  </span>
                  <span className="mt-[1px] block truncate text-slate-500 text-[14px] leading-[18px]">
                    {persona?.email || EMPTY}
                  </span>
                  <span className="mt-[1px] block truncate text-slate-400 text-[13px] leading-[17px]">
                    {persona?.role || EMPTY}
                  </span>
                </span>
                <ChevronRight className="size-[18px] shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
              </button>
            </Card>

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
          </>
        )}
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
              className="absolute end-3 top-3 cursor-pointer rounded-full bg-white/15 text-destructive-foreground hover:bg-white/25 hover:text-destructive-foreground"
            >
              <X className="size-[16px]" />
            </Button>
          </div>
        </div>
      ) : null}

      <TabBar activeTab="account" />
    </div>
  )
}
