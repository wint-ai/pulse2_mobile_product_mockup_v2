// @vitest-environment happy-dom
//
// MoreMenu — the floating menu that replaces the System and Location pages'
// segmented tab row.
//
// Owner, 2026-11-07: "we are replacing tabs with the more button" / "needs to
// open as a floating component like in ios".
//
// WHAT THIS FILE IS FOR. Collapsing a visible row of controls behind one
// button is exactly the change that quietly drops one of its states, so the
// things pinned here are the ones that would rot silently:
//
//   1. IT DOES NOT PORTAL. Radix DropdownMenu/Popover/Select would, and a
//      portal escapes the fixed 393x852 phone frame by design. The layer has
//      to be inside the page, at z-50.
//   2. THE IDS SURVIVE. `overview` / `systems` / `general` are what page
//      state, systemsTabScope and the existing suites navigate by. A rename
//      here is a silent break there.
//   3. THE ACCESSIBLE NAME IS THE LABEL ALONE. Folding a count into it once
//      renamed "Systems" to "Systems 103" and broke systemsTabScope's lookup.
//   4. EVERY DISMISSAL ROUTE STILL WORKS — scrim, Escape, pick, navigation.
//      Three of the four are invisible and none of them is exercised by
//      looking at the screen.
//   5. FOCUS GOES IN AND COMES BACK. A menu you can tab out of is a menu that
//      strands keyboard users behind a scrim.
//   6. `Switch location` IS NOT HERE. See THE NAME THAT MUST NOT BE HERE.

import { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'

import MoreMenu from '@/v2/components/MoreMenu'
import {
  MORE_MENU_IDS,
  MORE_MENU_LABELS,
  MORE_MENU_HEADING,
  MORE_MENU_ROW_MIN_HEIGHT,
  systemMoreMenuItems,
  locationMoreMenuItems,
} from '@/v2/components/moreMenuModel'

afterEach(cleanup)

const BADGE_ID = 'more-badge'
const MENU_ID = 'more-menu'

/* A stand-in for AppHeaderBar's More badge. Only the two things MoreMenu's
   contract actually touches: the id it is found and re-focused by, and the
   aria-controls that points at the menu. Agent A owns the real one. */
function Harness({ items, value: initial = MORE_MENU_IDS.overview, onSelect, startOpen = true }) {
  const [open, setOpen] = useState(startOpen)
  const [value, setValue] = useState(initial)
  return (
    <div className="relative" data-name="page-root">
      <button
        type="button"
        id={BADGE_ID}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={MENU_ID}
        onClick={() => setOpen(true)}
      >
        More
      </button>
      <MoreMenu
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        value={value}
        onSelect={(id) => {
          setValue(id)
          onSelect?.(id)
        }}
        id={MENU_ID}
        labelledBy={BADGE_ID}
      />
    </div>
  )
}

function mount(ui) {
  return render(<MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>)
}

const menu = () => screen.queryByRole('menu')
const rows = () => screen.queryAllByRole('menuitem')
const badge = () => document.getElementById(BADGE_ID)
const layer = (c) => c.querySelector('[data-name="more-menu-layer"]')
const scrim = (c) => c.querySelector('[data-name="more-menu-scrim"]')

// ── Structure ───────────────────────────────────────────────────────────────

describe('MoreMenu — the shell', () => {
  it('renders nothing at all while it is shut', () => {
    const { container } = mount(
      <Harness items={systemMoreMenuItems()} startOpen={false} />,
    )
    expect(menu()).toBeNull()
    expect(layer(container)).toBeNull()
    /* Not "hidden" — ABSENT. A row that is in the DOM while the menu is shut
       is a control a sighted user cannot see but a query can still find, which
       is how a contract name gets handed to the wrong element. */
    expect(container.textContent).not.toContain(MORE_MENU_LABELS.general)
  })

  it('is an in-frame absolute layer at z-50 and does NOT portal to the body', () => {
    /* THE WHOLE REASON THIS COMPONENT IS HAND-ROLLED. Radix DropdownMenu,
       Popover, Select, Dialog, Sheet and Tooltip all render through a portal
       to document.body, and this app draws inside a fixed 393x852 frame with
       overflow:hidden (src/components/Phone.jsx). A portal escapes that frame
       and paints across the whole browser window. The prohibition is written
       out at AccountScreenV2.jsx and ValveConfirmSheet.jsx:17-24. */
    const { container } = mount(<Harness items={systemMoreMenuItems()} />)

    const host = layer(container)
    expect(host, 'the menu layer is not inside the page container').toBeTruthy()
    expect(container.contains(menu())).toBe(true)

    const cls = host.getAttribute('class')
    expect(cls).toContain('absolute')
    expect(cls).toContain('inset-0')
    /* z-50 is the overlay tier: above the floating TabBar pill (whose host is
       `auto`), below the 300 tier. CSS paints positive z-index after `auto`
       regardless of DOM order. */
    expect(cls).toContain('z-50')

    /* Nothing of the menu escaped into the body outside the RTL container. */
    for (const child of document.body.children) {
      if (child === container) continue
      expect(child.querySelector('[data-name="more-menu-layer"]')).toBeNull()
    }
  })

  it('wires id / aria-labelledby to the badge that opens it', () => {
    mount(<Harness items={systemMoreMenuItems()} />)
    expect(menu().getAttribute('id')).toBe(MENU_ID)
    expect(menu().getAttribute('aria-labelledby')).toBe(BADGE_ID)
    expect(badge().getAttribute('aria-controls')).toBe(MENU_ID)
    expect(menu().getAttribute('aria-orientation')).toBe('vertical')
  })

  it('gives every row at least Apple’s 44px minimum target', () => {
    const { container } = mount(
      <Harness items={locationMoreMenuItems({ systemCount: 244 })} />,
    )
    const all = rows()
    expect(all.length).toBeGreaterThan(0)
    for (const row of all) {
      expect(
        row.getAttribute('class'),
        'a menu row dropped under the minimum touch target',
      ).toContain(`min-h-[${MORE_MENU_ROW_MIN_HEIGHT}px]`)
    }
    expect(container.querySelector('[data-name="more-menu-card"]')).toBeTruthy()
  })
})

// ── Contents ────────────────────────────────────────────────────────────────

describe('MoreMenu — what it says, and what it must never say', () => {
  it('draws the Location page’s destinations, in the tab row’s order', () => {
    mount(<Harness items={locationMoreMenuItems({ systemCount: 244 })} />)
    expect(rows().map((r) => r.getAttribute('data-menu-item'))).toEqual([
      MORE_MENU_IDS.overview,
      MORE_MENU_IDS.systems,
      MORE_MENU_IDS.general,
    ])
  })

  it('draws the System page’s destinations', () => {
    mount(<Harness items={systemMoreMenuItems()} />)
    expect(rows().map((r) => r.getAttribute('data-menu-item'))).toEqual([
      MORE_MENU_IDS.overview,
      MORE_MENU_IDS.general,
    ])
  })

  it('THE NAME THAT MUST NOT BE HERE: no row answers to `Switch location`', () => {
    /* Contract §5 moved the drawer door into this menu, because deleting the
       header's PanelLeft would otherwise have left both pages with no way into
       NavigationDrawer. The owner then redirected the same day: the footer's
       More tab becomes Search and IT opens the drawer. So the door is not
       here any more.
       EXACTLY ONE element per route may answer to `Switch location` —
       valveCommitReachable:224 and dashboardHeaderBar:273 both assert the
       count, and three further suites navigate by the name, two of them
       taking the LAST match of a querySelectorAll. If this menu wore the name
       as well as the Search tab, those suites would break by silently picking
       the wrong control, which fails nothing until someone looks. */
    const { container } = mount(
      <Harness items={locationMoreMenuItems({ systemCount: 244 })} />,
    )
    expect(container.querySelectorAll('[aria-label="Switch location"]')).toHaveLength(0)
    expect(container.textContent).not.toContain('Switch location')
  })

  it('names a row by its label ALONE, and says the count separately', () => {
    /* Folding the number into the name once renamed "Systems" to
       "Systems 103", which broke systemsTabScope's lookup and would break
       anyone navigating by name. PillTabs' CountBadge settled this rule; the
       menu follows it so the two controls stay queryable the same way.
       The copy standard §4 forbids two counts abutting in textContent for the
       same reason. */
    mount(<Harness items={locationMoreMenuItems({ systemCount: 244 })} />)

    const systems = screen.getByRole('menuitem', { name: MORE_MENU_LABELS.systems })
    expect(systems).toBeTruthy()

    const count = within(systems).getByLabelText('244 systems')
    expect(count.textContent).toBe('244')
  })

  it('draws no count when there is none to draw', () => {
    /* `null` is the honest state while the data is absent. A `0` would be a
       measurement, and this menu must not invent one. */
    mount(<Harness items={locationMoreMenuItems({ systemCount: null })} />)
    const systems = screen.getByRole('menuitem', { name: MORE_MENU_LABELS.systems })
    expect(systems.textContent).toBe(MORE_MENU_LABELS.systems)
  })

  it('marks the item in effect with aria-current, on exactly one row', () => {
    /* The iOS idiom is a checkmark (UIMenuElement.State.on). A glyph alone
       would make shape and colour the only cue, which this repo's
       accessibility rule forbids outright — so the state is announced too. */
    mount(
      <Harness
        items={locationMoreMenuItems({ systemCount: 8 })}
        value={MORE_MENU_IDS.systems}
      />,
    )
    const marked = rows().filter((r) => r.getAttribute('aria-current') === 'true')
    expect(marked).toHaveLength(1)
    expect(marked[0].getAttribute('data-menu-item')).toBe(MORE_MENU_IDS.systems)
  })

  it('draws a separator only for a group break, never above the first row', () => {
    /* Apple: separators mark GROUPS, not rows — "In general, you don't want
       more than about three groups." Today's two lists use none; the prop is
       kept because the orphaned /more destinations may arrive as a second
       group. A rule above the top row is a group break with nothing on the
       other side of it. */
    const { container } = mount(
      <Harness
        items={[
          { id: 'a', label: 'Overview', separatorBefore: true },
          { id: 'b', label: 'General Info' },
          { id: 'c', label: 'Reports', separatorBefore: true },
        ]}
      />,
    )
    const seps = container.querySelectorAll('[data-slot="separator"]')
    expect(seps).toHaveLength(1)
    expect(seps[0].getAttribute('role')).toBe('separator')
  })
})

// ── Behaviour ───────────────────────────────────────────────────────────────

describe('MoreMenu — dismissal', () => {
  it('closes on a scrim tap', () => {
    const { container } = mount(<Harness items={systemMoreMenuItems()} />)
    expect(menu()).toBeTruthy()
    fireEvent.click(scrim(container))
    expect(menu()).toBeNull()
  })

  it('closes on Escape and does not let it bubble on past the menu', () => {
    /* An Escape that keeps going would close the menu AND whatever the menu is
       sitting on — on these pages, the page's own overlays. */
    const outer = vi.fn()
    render(
      <MemoryRouter initialEntries={['/']}>
        <div onKeyDown={outer}>
          <Harness items={systemMoreMenuItems()} />
        </div>
      </MemoryRouter>,
    )
    fireEvent.keyDown(menu(), { key: 'Escape' })
    expect(menu()).toBeNull()
    expect(outer).not.toHaveBeenCalled()
  })

  it('closes on a pick, and reports the id the page already knows', () => {
    const onSelect = vi.fn()
    mount(<Harness items={systemMoreMenuItems()} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('menuitem', { name: MORE_MENU_LABELS.general }))
    expect(onSelect).toHaveBeenCalledWith(MORE_MENU_IDS.general)
    expect(menu()).toBeNull()
  })

  it('closes on a route change', () => {
    /* A menu that survives a navigation reopens over a page it was never
       built for. */
    function Nav() {
      const navigate = useNavigate()
      return <button type="button" onClick={() => navigate('/elsewhere')}>go</button>
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Nav />
        <Routes>
          <Route path="*" element={<Harness items={systemMoreMenuItems()} />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(menu()).toBeTruthy()
    fireEvent.click(screen.getByText('go'))
    expect(menu()).toBeNull()
  })

  it('lets an item ACT instead of navigating, without reporting a non-destination id', () => {
    /* An item carrying its own onSelect does that and nothing else, so a page
       never has to filter an id that is not one of its destinations back out.
       Nothing uses this today; `/more`'s orphaned destinations might. */
    const act = vi.fn()
    const onSelect = vi.fn()
    mount(
      <Harness
        items={[{ id: 'reports', label: 'Reports', onSelect: act }]}
        onSelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reports' }))
    expect(act).toHaveBeenCalledWith('reports')
    expect(onSelect).not.toHaveBeenCalled()
    expect(menu()).toBeNull()
  })
})

describe('MoreMenu — focus', () => {
  it('moves focus into the menu on open, onto the row in effect', () => {
    mount(
      <Harness
        items={locationMoreMenuItems({ systemCount: 8 })}
        value={MORE_MENU_IDS.general}
      />,
    )
    expect(document.activeElement.getAttribute('data-menu-item')).toBe(MORE_MENU_IDS.general)
  })

  it('falls back to the first row when nothing is in effect', () => {
    mount(<Harness items={systemMoreMenuItems()} value="not-a-row" />)
    expect(document.activeElement.getAttribute('data-menu-item')).toBe(MORE_MENU_IDS.overview)
  })

  it('returns focus to the badge on close', () => {
    /* Not to "whatever had focus": picking an item can navigate, and focus
       belongs on the control the user pressed, not on something the new view
       happens to mount. */
    const { container } = mount(<Harness items={systemMoreMenuItems()} />)
    fireEvent.click(scrim(container))
    expect(document.activeElement).toBe(badge())
  })

  it('traps Tab inside the menu and wraps at both ends', () => {
    /* A menu you can tab out of strands the keyboard user behind a scrim that
       a pointer cannot get past. */
    mount(<Harness items={locationMoreMenuItems({ systemCount: 8 })} value="none" />)
    const ids = () => document.activeElement.getAttribute('data-menu-item')

    expect(ids()).toBe(MORE_MENU_IDS.overview)
    fireEvent.keyDown(menu(), { key: 'Tab' })
    expect(ids()).toBe(MORE_MENU_IDS.systems)
    fireEvent.keyDown(menu(), { key: 'Tab' })
    expect(ids()).toBe(MORE_MENU_IDS.general)
    fireEvent.keyDown(menu(), { key: 'Tab' })
    expect(ids(), 'Tab walked out of the menu at the last row').toBe(MORE_MENU_IDS.overview)
    fireEvent.keyDown(menu(), { key: 'Tab', shiftKey: true })
    expect(ids()).toBe(MORE_MENU_IDS.general)
  })

  it('moves on the arrow keys and jumps on Home/End', () => {
    mount(<Harness items={locationMoreMenuItems({ systemCount: 8 })} value="none" />)
    const ids = () => document.activeElement.getAttribute('data-menu-item')

    fireEvent.keyDown(menu(), { key: 'ArrowDown' })
    expect(ids()).toBe(MORE_MENU_IDS.systems)
    fireEvent.keyDown(menu(), { key: 'ArrowUp' })
    expect(ids()).toBe(MORE_MENU_IDS.overview)
    fireEvent.keyDown(menu(), { key: 'End' })
    expect(ids()).toBe(MORE_MENU_IDS.general)
    fireEvent.keyDown(menu(), { key: 'Home' })
    expect(ids()).toBe(MORE_MENU_IDS.overview)
  })
})

// ── The model ───────────────────────────────────────────────────────────────

describe('moreMenuModel', () => {
  it('keeps the three ids the pages and the existing suites navigate by', () => {
    /* A change of CONTROL, not of destination. These ids are what PillTabs
       already passes at both call sites; systemsTabScope and
       scopePersistsAcrossTabs go with them. */
    expect(MORE_MENU_IDS).toEqual({
      overview: 'overview',
      systems: 'systems',
      general: 'general',
    })
  })

  it('carries the tab row’s own labels, not new ones', () => {
    expect(MORE_MENU_LABELS).toEqual({
      overview: 'Overview',
      systems: 'Systems',
      general: 'General Info',
    })
  })

  it('can drop Overview in one argument, for the owner’s call', () => {
    /* Overview is in both lists because without it there is no way back to it
       once General Info is picked — the tab row that did that in one tap is
       deleted by the same change. The reasoning, and the fact that it is
       RAISED rather than decided, is on OVERVIEW_ITEM in moreMenuModel.js. */
    expect(systemMoreMenuItems({ includeOverview: false }).map((i) => i.id)).toEqual([
      MORE_MENU_IDS.general,
    ])
    expect(
      locationMoreMenuItems({ systemCount: 8, includeOverview: false }).map((i) => i.id),
    ).toEqual([MORE_MENU_IDS.systems, MORE_MENU_IDS.general])
  })

  it('reports a missing count as null rather than inventing a zero', () => {
    const [, systems] = locationMoreMenuItems({})
    expect(systems.count).toBeNull()
  })
})

// ── The 2026-11-08 frame ────────────────────────────────────────────────────
//
// 200047:135363 — the `SelectContent` instance, 204x165, right-aligned under
// the More badge. These pin the parts of it that a later "tidy" would silently
// undo, and the two places the frame was deliberately NOT followed.

describe('MoreMenu — the frame (200047:135363)', () => {
  it('draws the frame’s heading, and makes it the section group’s name', () => {
    /* The frame's SelectLabel. It is NOT a direct child of role="menu": that
       role restricts its children to menuitem / group / separator, so a bare
       <p> there would be invalid and the heading would reach a screen reader
       as nothing at all. It labels a real group instead. */
    const { container } = mount(<Harness items={systemMoreMenuItems()} />)

    const heading = container.querySelector('[data-name="more-menu-heading"]')
    expect(heading, 'the frame’s SelectLabel is missing').toBeTruthy()
    expect(heading.textContent).toBe(MORE_MENU_HEADING)
    expect(MORE_MENU_HEADING).toBe('Select preview')

    const group = screen.getByRole('group')
    expect(group.getAttribute('aria-labelledby')).toBe(heading.getAttribute('id'))
    /* Announced as the group's name, not merely present in the DOM. */
    expect(screen.getByRole('group', { name: MORE_MENU_HEADING })).toBeTruthy()
  })

  it('reserves a leading icon slot on every row, and fills all three today', () => {
    /* The frame's structural inversion: the leading gutter is the ICON's and
       the tick trails. The slot is reserved whether or not an item passes an
       icon, so labels stay on one left edge — a gutter that appears and
       disappears shifts the menu sideways as you use it.

       Apple: "provide icons for all menu items in a group, or none of them."
       The frame picks all, so an empty slot on any of today's three rows is a
       regression, not a choice. */
    mount(<Harness items={locationMoreMenuItems({ systemCount: 244 })} />)

    for (const row of rows()) {
      const id = row.getAttribute('data-menu-item')
      const slot = row.querySelector('[data-name="more-menu-item-icon"]')
      expect(slot, `${id} has no leading icon slot`).toBeTruthy()
      expect(slot.querySelector('svg'), `${id} lost its glyph`).toBeTruthy()
    }
  })

  it('puts the tick on the TRAILING edge, on the row in effect only', () => {
    const { container } = mount(
      <Harness items={systemMoreMenuItems()} value={MORE_MENU_IDS.overview} />,
    )
    const ticks = container.querySelectorAll('[data-name="more-menu-item-check"]')
    expect(ticks).toHaveLength(1)

    const row = screen.getByRole('menuitem', { name: MORE_MENU_LABELS.overview })
    expect(row.contains(ticks[0])).toBe(true)

    /* TRAILING: the tick is the last element child of the row, after the
       label. Until 2026-11-08 it was the first. */
    expect(row.lastElementChild).toBe(ticks[0])
    expect(row.firstElementChild.getAttribute('data-name')).toBe('more-menu-item-icon')
  })

  it('paints the row in effect with the frame’s fill and a --primary label', () => {
    /* #0b81f8 is the node's `--wint-blue-accent`, and there is NO
       `--color-wint-blue-accent` registered in @theme inline — a
       `text-wint-blue-accent` utility would emit no CSS and no error. The hex
       is carried by `--primary` (src/index.css:173). This test is the tripwire
       for anyone who "restores" the Figma name. */
    mount(<Harness items={systemMoreMenuItems()} value={MORE_MENU_IDS.overview} />)

    const on = screen.getByRole('menuitem', { name: MORE_MENU_LABELS.overview })
    const off = screen.getByRole('menuitem', { name: MORE_MENU_LABELS.general })

    expect(on.getAttribute('class')).toContain('bg-slate-100')
    expect(on.getAttribute('class')).toContain('text-primary')
    expect(on.getAttribute('class')).not.toContain('wint-blue-accent')
    expect(off.getAttribute('class')).not.toContain('bg-slate-100')
  })

  it('carries the frame’s chassis: 204 wide, 18px radius, fluid, never x=172', () => {
    /* The frame is 402 wide and puts the card at x=172; the shell is 393.
       Neither the 402 nor the 172 may appear here — the card is right-anchored
       off the measured badge, so the difference resolves itself. */
    const { container } = mount(<Harness items={systemMoreMenuItems()} />)
    const card = container.querySelector('[data-name="more-menu-card"]')

    const cls = card.getAttribute('class')
    expect(cls).toContain('w-[204px]')
    expect(cls).toContain('rounded-[18px]')
    /* Fluid: it never exceeds the host, whatever the host is. */
    expect(cls).toContain('max-w-[calc(100%-32px)]')
    expect(cls).not.toContain('w-[402px]')
    expect(card.outerHTML).not.toContain('172px')
    expect(card.style.left, 'the card is right-anchored, never left-positioned').toBe('')
  })

  it('draws the count as the frame’s badge, bound to live data not the frame’s 8', () => {
    /* The node's badge reads a literal `8`. The same 8-on-a-Locations-row turns
       up across unrelated nodes in that file on surfaces that cannot count 8 of
       anything, so it is Figma's default component content. Transcribing it
       would put a fabricated number on the face of the UI. */
    mount(<Harness items={locationMoreMenuItems({ systemCount: 244 })} />)

    const systems = screen.getByRole('menuitem', { name: MORE_MENU_LABELS.systems })
    const badgeEl = systems.querySelector('[data-name="more-menu-item-count"]')
    expect(badgeEl).toBeTruthy()
    expect(badgeEl.textContent).toBe('244')
    expect(badgeEl.getAttribute('class')).toContain('rounded-[14px]')
    /* Themed, not Figma's rgba literals: PillTabs' BADGE_WASH reads
       --app-bg-stops because the literals measured 4.22:1 under `dark`. */
    expect(badgeEl.getAttribute('style')).toContain('--app-bg-stops')
    expect(badgeEl.getAttribute('style')).not.toContain('233, 238, 248')
  })

  it('draws BOTH the tick and the badge on a selected row that has a count', () => {
    /* The frame never draws this state — its selected row is Overview, which
       has no badge — but it is one tap away and both suites that open this
       menu reach it. Dropping either would drop information rather than
       transcribe an absence. */
    mount(
      <Harness
        items={locationMoreMenuItems({ systemCount: 8 })}
        value={MORE_MENU_IDS.systems}
      />,
    )
    const systems = screen.getByRole('menuitem', { name: MORE_MENU_LABELS.systems })
    expect(systems.querySelector('[data-name="more-menu-item-count"]')).toBeTruthy()
    expect(systems.querySelector('[data-name="more-menu-item-check"]')).toBeTruthy()
    /* And the state is still ANNOUNCED, not left to the glyph. */
    expect(systems.getAttribute('aria-current')).toBe('true')
  })

  it('keeps a visible focus ring, including on the row that opens focused', () => {
    /* The old `focus-visible:bg-accent` was invisible on exactly the row that
       takes focus first: the one in effect already carries a slate-100 fill. */
    mount(<Harness items={systemMoreMenuItems()} value={MORE_MENU_IDS.overview} />)
    const focused = document.activeElement
    expect(focused.getAttribute('data-menu-item')).toBe(MORE_MENU_IDS.overview)
    expect(focused.getAttribute('class')).toContain('focus-visible:ring-2')
    expect(focused.getAttribute('class')).toContain('focus-visible:ring-ring')
  })

  it('does NOT take the frame’s two renames, which other suites pin', () => {
    /* systemsTabScope:65 and valveWidgetMount:593 both do
       getByRole('menuitem', { name }) over these three, and systemsTabScope:78
       further pins aria-label === 'Systems' and a count read as N systems. The
       frame says `Locations` and `General info`. Taking either rename fails two
       files this change does not own, and `Locations` would also misdescribe
       the row, which still opens the SYSTEMS table. RAISED, not resolved. */
    mount(<Harness items={locationMoreMenuItems({ systemCount: 244 })} />)

    expect(screen.getByRole('menuitem', { name: 'Systems' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'General Info' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Locations' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'General info' })).toBeNull()
  })

  it('holds the 44px floor rather than the frame’s 36px row', () => {
    /* The node's SelectItem is a fixed h-[36px] — 8px under Apple's minimum.
       The floor is kept and the ~24px of extra card height is reported. */
    mount(<Harness items={locationMoreMenuItems({ systemCount: 8 })} />)
    for (const row of rows()) {
      const cls = row.getAttribute('class')
      expect(cls).toContain(`min-h-[${MORE_MENU_ROW_MIN_HEIGHT}px]`)
      expect(cls, 'a fixed 36px height would cap the row under the floor').not.toContain('h-[36px]')
    }
  })
})
