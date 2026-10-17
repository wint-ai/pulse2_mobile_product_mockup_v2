// @vitest-environment happy-dom
//
// The v2 Account / "More" page (src/v2/pages/AccountScreenV2.jsx), which now
// serves /account in place of src/screens/AccountScreen.jsx.
//
// Four things are pinned here, and each one is a bug this port either fixed or
// could easily have introduced:
//
//  1. IT RENDERS, with every section v1 carried. The port is ~85% chrome; a
//     section quietly lost in the rewrite would look like a design decision.
//  2. THE LANGUAGE PICKER STILL LISTS HEBREW. The whole screen is the only
//     place the app's language can be changed, and he/RTL is a shipped
//     language (src/i18n/index.js). A picker that renders only English is the
//     specific way this port could break i18n while still looking correct.
//  3. THE CONFIRM MODAL OPENS INSIDE THE PHONE FRAME. v1 opened it with
//     `position: fixed`, which is positioned against the viewport, not the
//     393x852 Phone.jsx frame — it greyed out the whole browser window. The
//     test asserts the overlay is a DESCENDANT of the page root (so it is not
//     portalled to document.body the way a Radix <Sheet> would be) and that
//     nothing in the page uses fixed positioning.
//  4. THE SCOPE COUNTS RENDER, from the persona's real visibleSystems rather
//     than placeholders.

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

describe('AccountScreenV2 renders every v1 section', () => {
  it('renders the screen with its sections', () => {
    renderScreen()

    // 'More' is also the TabBar label, so the title is picked by role.
    expect(screen.getByRole('heading', { name: 'More' })).toBeInTheDocument()
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

  it('opens the Personal information sub-view and comes back', () => {
    renderScreen()

    // The persona card is the entry point.
    // The persona name also appears inside the Switch-profile copy, so the card
    // is picked by the email it alone renders.
    fireEvent.click(screen.getByText('rami.kletshevsky@wint.ai').closest('button'))
    expect(screen.getAllByText('Personal Information').length).toBeGreaterThan(0)
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('My Scope')).toBeInTheDocument()
  })

  it('still carries a v1 capability that has no other entry point: replay onboarding', () => {
    renderScreen()
    // v1 pointed this at `/`, which no longer mounts <Onboarding>. The row has
    // to exist AND be a real control, not a decorative row.
    const row = screen.getByText('Learn how to use the app').closest('button')
    expect(row).not.toBeNull()
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
    // more.title and more.my_scope in he.json — the page itself, not just the
    // picker, has to follow.
    expect(await screen.findByRole('heading', { name: 'עוד' })).toBeInTheDocument()
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
