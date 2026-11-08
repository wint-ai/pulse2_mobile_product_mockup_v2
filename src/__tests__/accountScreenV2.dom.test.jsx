// @vitest-environment happy-dom
//
// The v2 Profile page (src/v2/pages/AccountScreenV2.jsx), which serves
// /account in place of src/screens/AccountScreen.jsx.
//
// IT WAS "Account / More" UNTIL 2026-11-04. It held two views in local state —
// 'main', titled "More", and 'profile', titled "Personal Information", behind
// a tap on the persona card — and the floating tab bar's Profile AND More
// items both pointed at it. The owner, three times in one day: "Profile needs
// to open the user profile. More doesn't need to open the user profile - they
// are separate buttons... make the More navigate to / overlay a new screen
// which hides everything, but writes there Coming soon." So More is /more
// (moreComingSoon.dom.test.jsx) and this is Profile, one scroll, Personal
// Information first. Three cases here changed with it: the title, the
// Hebrew title, and the sub-view round-trip, which became a no-tap landing.
//
// Six things are pinned here, and each one is a bug this port either fixed or
// could easily have introduced:
//
//  1. IT RENDERS, with every section v1 carried. The port is ~85% chrome; a
//     section quietly lost in the rewrite would look like a design decision.
//  2. EVERY SECTION RENDERS ITS CONTENT, not just its header. See WHY THE
//     EARLIER TESTS WERE NOT ENOUGH below.
//  3. THE SCROLL CONTAINER CANNOT SQUASH ITS CHILDREN. Same note.
//  4. THE LANGUAGE PICKER STILL LISTS HEBREW. The whole screen is the only
//     place the app's language can be changed, and he/RTL is a shipped
//     language (src/i18n/index.js). A picker that renders only English is the
//     specific way this port could break i18n while still looking correct.
//  5. THE CONFIRM MODAL OPENS INSIDE THE PHONE FRAME. v1 opened it with
//     `position: fixed`, which is positioned against the viewport, not the
//     393x852 Phone.jsx frame — it greyed out the whole browser window. The
//     test asserts the overlay is a DESCENDANT of the page root (so it is not
//     portalled to document.body the way a Radix <Sheet> would be) and that
//     nothing in the page uses fixed positioning.
//  6. THE SCOPE COUNTS RENDER, from the persona's real visibleSystems rather
//     than placeholders.
//
// WHY THE EARLIER TESTS WERE NOT ENOUGH
//
// This file was green while the page was visibly broken in the browser: the
// scroll container is a flex COLUMN, so a child that does not say `shrink-0`
// is compressed to fit instead of making the region scroll, and the cards'
// `overflow-hidden` then eats whatever no longer fits. The persona card was
// cut mid-line, Push and SMS were empty headers, Measurement Units was gone
// entirely, and the page did not scroll.
//
// None of that is observable here, for two independent reasons:
//
//   a. happy-dom has NO LAYOUT ENGINE. scrollHeight and clientHeight are
//      always 0 and getBoundingClientRect() is all zeros, so a squashed box
//      and a correct one are indistinguishable. `scrollHeight > clientHeight`
//      cannot be asserted in this environment at all — it is measured in a
//      real browser at 393x852 instead (1027 vs 744 at the time of writing).
//   b. The old assertions only asked whether a STRING was in the document.
//      Every section was in the document the whole time; it was the PIXELS
//      that were missing. `getByText('Measurement Units')` passed on a page
//      where Measurement Units was invisible, because the label was still in
//      the DOM inside a clipped box.
//
// So this file does the two things that ARE assertable, and they are the two
// things that were actually wrong:
//
//   - CONTENT, SCOPED TO ITS SECTION. Each section is located by its heading,
//     then its own card is asserted to contain the controls that belong to it.
//     An empty "Push Notifications" header no longer passes.
//   - THE CLASS CONTRACT that governs the layout. Same reasoning as
//     homeWidgetWidth.dom.test.jsx and scripts/check-text-overflow.mjs: when
//     the bug is a CSS fact, the class contract is the assertable thing, and
//     it is the thing that was wrong.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import AccountScreenV2 from '@/v2/pages/AccountScreenV2'
import { UserProvider } from '@/context/UserContext'
import i18n from '@/i18n'
import { SUPPORTED_LANGUAGES } from '@/i18n'

afterEach(async () => {
  cleanup()
  // Every test must start in English, whatever the previous one switched to.
  if (i18n.language !== 'en') await i18n.changeLanguage('en')
})

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <UserProvider>
        <AccountScreenV2 />
      </UserProvider>
    </MemoryRouter>,
  )
}

/** The <Card> a section's heading lives in — the scope its content must be in. */
function sectionCard(heading) {
  const card = screen.getByText(heading).closest('[data-slot="card"]')
  expect(card, `"${heading}" should sit inside a card`).not.toBeNull()
  return within(card)
}

/** The page's one scroll region, found the way the shell contract describes it. */
function scrollRegion(container) {
  const found = [...container.querySelectorAll('div')]
    .filter((el) => /\boverflow-y-auto\b/.test(el.className))
  // "Exactly one child is flex:1 / overflowY:auto / minHeight:0" — two scroll
  // regions in one screen is the other way this contract breaks.
  expect(found, 'the screen must own exactly one scroll region').toHaveLength(1)
  return found[0]
}

/**
 * Nothing in the scroll region may be compressible.
 *
 * A child is safe if the container forbids shrinking for all of them
 * (`[&>*]:shrink-0`) or if it says `shrink-0` itself. The page does both; this
 * only needs one, and it names the children that rely on the fallback so a
 * failure says which section was added without it.
 */
function expectNothingCanShrink(container) {
  const region = scrollRegion(container)
  const guardsAll = /\[&>\*\]:shrink-0/.test(region.className)
  const unguarded = [...region.children]
    .filter((child) => !/\bshrink-0\b/.test(String(child.className)))
    .map((child) => (child.textContent || '').slice(0, 40))
  expect(
    guardsAll || unguarded.length === 0,
    `these children of the scroll column can be squashed: ${unguarded.join(' / ')}`,
  ).toBe(true)
  return region
}

describe('AccountScreenV2 renders every v1 section', () => {
  it('renders the screen with its sections', () => {
    renderScreen()

    // 'Profile' is also the TabBar label, so the title is picked by role.
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByText('Switch profile')).toBeInTheDocument()
    expect(screen.getByText('My Scope')).toBeInTheDocument()
    expect(screen.getByText('Personal Settings')).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Measurement Units')).toBeInTheDocument()
    expect(screen.getByText('Push Notifications')).toBeInTheDocument()
    expect(screen.getByText('SMS Notifications')).toBeInTheDocument()
    expect(screen.getByText('Tutorial')).toBeInTheDocument()
    expect(screen.getByText(/Pulse 2\.0/)).toBeInTheDocument()
  })

  /* 2026-11-04. This used to read "opens the Personal information sub-view and
     comes back": the screen held two views in local state and the persona card
     was the only way into the second one. The owner, three times in one day —
     "Profile needs to open the user profile. More doesn't need to open the
     user profile - they are separate buttons" — so More moved to /more and
     this screen is Profile, whole, with no sub-view and no back arrow.

     THE TAP IS THE POINT. The complaint was literally about an extra tap, so
     what is pinned is that Personal Information is on screen with NO events
     fired at all, beside the rest of the surface rather than instead of it. */
  it('lands on Personal Information with no tap, and keeps the rest of the screen', () => {
    renderScreen()

    expect(screen.getByText('Personal Information')).toBeInTheDocument()
    /* THIS ASSERTED 'First Name' AND 'Last Name' UNTIL 2026-11-08, and both
       rows are gone on purpose: they split the person's name across two
       half-width fields sitting directly under that same name, so the card's
       loudest string was restated twice in its quietest place. The identity
       row above the list is the name now.

       What replaces them is a stronger check of the same property — that
       this screen lands on the real Personal Information card and not a
       header alone. 'Email' and 'Account' are LABELS of rows that exist only
       inside that card, and 'Account' is new here: the account the person
       belongs to was shown nowhere on the screen before. */
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()

    // Not an either/or any more: the old 'main' sections are on the same
    // scroll, which is the Rule 0 half of this change.
    expect(screen.getByText('My Scope')).toBeInTheDocument()
    expect(screen.getByText('Personal Settings')).toBeInTheDocument()

    // No back arrow: a tab destination has nothing to go back to, and the
    // button only ever existed to leave the sub-view.
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  /* Rule 0 (.claude/skills/v2-page-parity/SKILL.md) applied to the one change
     that could have dropped something silently. Users and Reports arrived here
     this morning at the owner's request and are arguably MORE's surface; they
     are deliberately not moved onto the placeholder, because /more "hides
     everything" and would hide them. */
  it('keeps every row the old More view carried, Users and Reports included', () => {
    renderScreen()
    for (const row of ['Users', 'Reports', 'Switch profile', 'Tutorial', 'My Scope']) {
      expect(screen.getByText(row), `${row} went missing`).toBeInTheDocument()
    }
    expect(screen.getAllByText('Coming soon')).toHaveLength(2)
  })

  /* The whole point of the 2026-11-04 change: two tabs, two destinations, and
     the right one lit. This screen used to pass activeTab="account", so the
     MORE tab lit up even when you arrived by tapping Profile.

     RE-AIMED 2026-11-07: the More tab no longer exists - the owner replaced
     it with Search, which is an ACTION and never lights. The hazard this test
     was written for survives the rename, so it is pinned the same way: the
     Profile tab is lit, and it is the ONLY lit tab. A key collision would
     show up as a second indicator, whatever the other tab happens to be. */
  it('lights the Profile tab, and nothing else', () => {
    renderScreen()
    const labelled = (name) =>
      [...document.querySelectorAll('button')].find(
        (b) => b.querySelector('span')?.textContent === name,
      )

    const profile = labelled('Profile')
    expect(profile, 'the Profile tab must be in the bar').not.toBeUndefined()
    expect(profile.className).toMatch(/\btext-primary\b/)

    expect(labelled('More'), 'the More tab was replaced by Search 2026-11-07').toBeUndefined()

    const lit = [...document.querySelectorAll('[data-name="tabbar-pill"] button')]
      .filter((b) => /\btext-primary\b/.test(b.className))
      .map((b) => b.querySelector('span')?.textContent)
    expect(lit, 'exactly one tab may be lit').toEqual(['Profile'])
  })

  it('still carries a v1 capability that has no other entry point: replay onboarding', () => {
    renderScreen()
    // v1 pointed this at `/`, which no longer mounts <Onboarding>. The row has
    // to exist AND be a real control, not a decorative row.
    const row = screen.getByText('Learn how to use the app').closest('button')
    expect(row).not.toBeNull()
  })
})

describe('every section renders its CONTENT, not just its header', () => {
  // This is the suite that would have failed on the broken page. Each case
  // scopes to the section's own card, so a header with nothing under it — the
  // exact way Push, SMS and Measurement Units presented — cannot pass.

  /* The persona card's DATA, after the card itself lost its job (its only
     destination was the sub-view this card now is). Name, email and role all
     have to survive the fold-in — role in particular appears nowhere else on
     this screen except as a permission WORD inside My Scope. */
  it('Personal Information carries name, email, phone AND role', () => {
    renderScreen()
    const card = screen.getByText('rami.kletshevsky@wint.ai').closest('[data-slot="card"]')
    expect(card).not.toBeNull()
    expect(within(card).getByText('Personal Information')).toBeInTheDocument()
    expect(within(card).getByText('Rami Kletshevsky')).toBeInTheDocument()
    expect(within(card).getByText('Wint Admin')).toBeInTheDocument()
    // Sign out is the card's one control, and it is still a real button.
    expect(within(card).getByText('Sign out').closest('button')).not.toBeNull()
    // The email is printed ONCE: the identity row deliberately dropped its
    // copy of it because the labelled field sits two rows below.
    expect(screen.getAllByText('rami.kletshevsky@wint.ai')).toHaveLength(1)
  })

  it('Personal Settings carries BOTH pickers — Language and Measurement Units', () => {
    renderScreen()
    const settings = sectionCard('Personal Settings')

    // Measurement Units is the one that vanished: it is the second row in this
    // card, so it is the first thing a squashed card clips.
    const units = settings.getByRole('radiogroup', { name: 'Measurement Units' })
    for (const option of ['Liters', 'Gallons', 'm³']) {
      expect(within(units).getByText(option)).toBeInTheDocument()
    }

    const language = settings.getByRole('radiogroup', { name: 'Language' })
    expect(within(language).getByText('English')).toBeInTheDocument()

    // Both rows live in the same card — Measurement Units beside Language,
    // under Personal Settings, as v1 had them.
    expect(settings.getByText('Language')).toBeInTheDocument()
    expect(settings.getByText('Measurement Units')).toBeInTheDocument()
  })

  it('Push Notifications carries its row and a working toggle', () => {
    renderScreen()
    const push = sectionCard('Push Notifications')
    const toggle = push.getByLabelText('Push')
    expect(toggle).toBeInTheDocument()
    // A real pressed-state control, not a styled <div> with an onClick.
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
  })

  it('SMS Notifications carries its row and a working toggle', () => {
    renderScreen()
    const sms = sectionCard('SMS Notifications')
    const toggle = sms.getByLabelText('SMS')
    expect(toggle).toBeInTheDocument()
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
  })

  it('Tutorial carries its description and is a real row', () => {
    renderScreen()
    const tutorial = sectionCard('Tutorial')
    expect(tutorial.getByText('Learn how to use the app')).toBeInTheDocument()
    expect(screen.getByText('Tutorial').closest('button')).not.toBeNull()
  })

  it('My Scope carries its counts AND its permission rows in one card', () => {
    renderScreen()
    const scope = sectionCard('My Scope')
    for (const label of ['Accounts', 'Locations', 'Systems']) {
      expect(scope.getByText(label)).toBeInTheDocument()
    }
    // The permission rows are the bottom of the card — what a squash clips.
    for (const row of ['Role', 'Valve control', 'Edit policies']) {
      expect(scope.getByText(row)).toBeInTheDocument()
    }
  })

  it('the both-off banner and the version footer render outside the cards', () => {
    renderScreen()
    expect(screen.getByRole('status')).toHaveTextContent(/notifications are OFF/i)
    expect(screen.getByText(/Pulse 2\.0 · v1\.2\.0/)).toBeInTheDocument()
  })
})

describe('the scroll region cannot squash what is in it', () => {
  // happy-dom cannot measure scrollHeight (see the header) — what IS assertable
  // is that nothing in the column is allowed to be compressed, which is the
  // precondition the overflow depends on.

  it('owns exactly one scroll region, with the three properties the shell needs', () => {
    const { container } = renderScreen()
    const region = scrollRegion(container)
    expect(region.className).toMatch(/\bflex-1\b/)
    expect(region.className).toMatch(/\bmin-h-0\b/)
    expect(region.className).toMatch(/\boverflow-y-auto\b/)
  })

  it('forbids every child of the column from shrinking — main view', () => {
    const { container } = renderScreen()
    const region = expectNothingCanShrink(container)
    // Sanity: the column really is populated, so the check above had something
    // to check. A fragment that rendered nothing would pass vacuously.
    expect(region.children.length).toBeGreaterThan(5)
  })

  /* There is one view now, so the former "Personal information view" case has
     nothing separate to check. What replaced it is the thing the merge could
     have broken: the Personal Information card is a direct child of the
     column like every other section, so it is subject to the same squash. */
  it('forbids every child of the column from shrinking — Personal Information included', () => {
    const { container } = renderScreen()
    const region = expectNothingCanShrink(container)
    const card = screen.getByText('Personal Information').closest('[data-slot="card"]')
    expect([...region.children]).toContain(card)
  })

  it('keeps the chrome and the TabBar out of the scroll region', () => {
    const { container } = renderScreen()
    const root = container.firstChild
    const region = scrollRegion(container)

    // Root: flex:1 / min-h-0 / column, and never a viewport height.
    expect(root.className).toMatch(/\bflex-1\b/)
    expect(root.className).toMatch(/\bmin-h-0\b/)
    expect(root.className).toMatch(/\bflex-col\b/)
    expect(root.className).not.toMatch(/\b(?:min-h-screen|h-screen)\b/)

    // The title bar is a shrink-0 sibling, not a scrolling child.
    const title = screen.getByRole('heading', { name: 'Profile' })
    expect(region.contains(title)).toBe(false)
    expect(title.parentElement.className).toMatch(/\bshrink-0\b/)

    // TabBar likewise — it is in the column, below the scroller.
    const tabBar = screen.getByText('Dashboard').closest('div[class*="shrink-0"]')
    expect(tabBar).not.toBeNull()
    expect(region.contains(tabBar)).toBe(false)
  })
})

describe('the language picker still offers Hebrew', () => {
  it('lists every SUPPORTED_LANGUAGE, Hebrew included', () => {
    renderScreen()

    const picker = screen.getByRole('radiogroup', { name: 'Language' })
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(within(picker).getByText(lang.label)).toBeInTheDocument()
    }
    // Named explicitly: the point of the test is he, not "whatever the array
    // happens to hold".
    expect(within(picker).getByText('עברית')).toBeInTheDocument()
  })

  it('switching to Hebrew re-renders the page in Hebrew', async () => {
    renderScreen()

    const picker = screen.getByRole('radiogroup', { name: 'Language' })
    fireEvent.click(within(picker).getByText('עברית'))

    expect(i18n.language).toBe('he')
    // tabs.profile and more.my_scope in he.json — the page itself, not just
    // the picker, has to follow. The title key changed from more.title ("עוד")
    // to tabs.profile ("פרופיל") when More moved to its own route.
    expect(await screen.findByRole('heading', { name: 'פרופיל' })).toBeInTheDocument()
    expect(screen.getByText('התחום שלי')).toBeInTheDocument()
  })
})

describe('the confirm modal opens inside the phone frame', () => {
  it('is an in-frame absolute overlay, not position:fixed and not portalled', () => {
    const { container } = renderScreen()
    const pageRoot = container.firstChild

    // Push on, then push off again: that second tap leaves both channels off,
    // which is what raises the confirm.
    const pushSwitch = screen.getByLabelText('Push')
    fireEvent.click(pushSwitch)
    fireEvent.click(pushSwitch)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Disable all notifications?')).toBeInTheDocument()

    // (a) It lives inside the page root — a Radix portal would have attached it
    //     to document.body, outside the 393x852 frame.
    expect(pageRoot.contains(dialog)).toBe(true)

    // (b) It is the house in-frame overlay: absolute inset-0, as
    //     SystemsFilterSheet / ValveConfirmSheet are.
    expect(dialog.className).toMatch(/\babsolute\b/)
    expect(dialog.className).toMatch(/\binset-0\b/)
    expect(dialog.className).not.toMatch(/\bfixed\b/)

    // (c) Nothing anywhere in the rendered page escapes the frame by position.
    for (const el of container.querySelectorAll('[style]')) {
      expect(el.getAttribute('style') || '').not.toMatch(/position:\s*fixed/)
    }

    // And it still does its job.
    fireEvent.click(within(dialog).getByText('Disable all'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('fires on the SECOND channel going off, whichever one that is, and Cancel undoes it', () => {
    renderScreen()
    const push = screen.getByLabelText('Push')
    const sms = screen.getByLabelText('SMS')

    // Turn both on: no confirm on the way up.
    fireEvent.click(push)
    fireEvent.click(sms)
    expect(screen.queryByRole('dialog')).toBeNull()

    // First one off is free — one channel is still live.
    fireEvent.click(push)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(sms.getAttribute('aria-pressed')).toBe('true')

    // The second one is the one that raises it.
    fireEvent.click(sms)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Cancel'))
    expect(screen.queryByRole('dialog')).toBeNull()
    // Cancel means cancel: SMS stays on rather than being silently turned off.
    expect(screen.getByLabelText('SMS').getAttribute('aria-pressed')).toBe('true')
  })

  it('the page root carries the positioning context the overlay needs', () => {
    const { container } = renderScreen()
    // `absolute inset-0` against a static ancestor would climb to the viewport
    // and reproduce the exact bug this port fixed.
    expect(container.firstChild.className).toMatch(/\brelative\b/)
  })
})

describe('My Scope reports the persona real counts', () => {
  it('renders the three counts as numbers, not placeholders', () => {
    renderScreen()

    for (const label of ['Accounts', 'Locations', 'Systems']) {
      const cell = screen.getByText(label).parentElement
      const count = cell.firstChild.textContent.trim()
      expect(count, `${label} count should be numeric`).toMatch(/^\d+$/)
    }

    // The default persona (Wint admin) sees the whole fleet, so Systems is not
    // zero — a 0/0/0 scope card would pass a "renders" test and be wrong.
    const systemsCell = screen.getByText('Systems').parentElement
    expect(Number(systemsCell.firstChild.textContent.trim())).toBeGreaterThan(0)
  })

  it('renders the permission rows', () => {
    renderScreen()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Full access')).toBeInTheDocument()
    expect(screen.getByText('Valve control')).toBeInTheDocument()
    expect(screen.getByText('Edit policies')).toBeInTheDocument()
    expect(screen.getAllByText('Yes')).toHaveLength(2)
  })
})
