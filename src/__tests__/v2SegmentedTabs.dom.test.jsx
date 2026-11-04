// @vitest-environment happy-dom
//
// The two v2 pages at /old and /old/system/:systemId used to draw a hand-rolled
// `TabButton` row: two plain <button>s, an underline painted by a sibling
// <span>, and nothing else. Measured in Chromium before the change, that row
// reported role=null, aria-selected=null, no tabpanel anywhere on the page, and
// BOTH buttons at tabIndex 0 — so a screen reader was told "button Overview",
// never which of the two was chosen or what either one opened, and a keyboard
// user paid a tab stop per trigger with no arrow-key movement between them.
//
// Both rows are now the design system's segmented control
// (src/components/ui/tabs.jsx, Figma 199922:83970), which is shadcn's Tabs and
// therefore Radix's. These tests pin the SEMANTICS that move brought, because
// they are invisible on screen and a future "simplify" pass that puts plain
// buttons back would look identical and pass every pixel check:
//
//   · the row is a tablist and its triggers are tabs,
//   · selection is reported by aria-selected, not only by colour,
//   · the panel is genuinely associated with its trigger in BOTH directions
//     (trigger aria-controls -> panel id, panel aria-labelledby -> trigger id),
//   · choosing the other tab swaps which panel is shown, and
//   · the row is ONE tab stop, with the arrow keys moving inside it.
//
// ⚠ RADIX TABS ACTIVATES ON mousedown, NOT click (verified in
//   node_modules/@radix-ui/react-tabs: the trigger's handlers are onMouseDown,
//   onKeyDown for Space/Enter, and onFocus for automatic activation — there is
//   no onClick). `fireEvent.click(tab)` is therefore a NO-OP against this
//   control and would make every switching test below pass vacuously on a
//   control that never switched. These use userEvent, which fires the real
//   pointer/mouse sequence a tap produces.
//
// The last block covers the two things the component must be able to do that
// neither page uses today — a THIRD trigger and a count badge — because the
// Figma frame draws both and the owner has not yet ruled on whether these
// pages get them. See HomeAllAccounts.jsx:1628 and the header of
// src/components/ui/tabs.jsx.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import HomeAccountOverview from '@/v2/pages/HomeAccountOverview'
import SystemPageV2 from '@/v2/pages/SystemPage'
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsCount } from '@/components/ui/tabs'
import { SYSTEMS } from '@/data/systems'

afterEach(cleanup)

/* The :systemId route has to be DECLARED, not just visited — rendering the
   page bare under a MemoryRouter leaves useParams() empty and SystemPage falls
   straight through to its "No system with id" branch, which has no tab row at
   all, so every assertion below would pass vacuously on an empty page. */
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/old" element={<HomeAccountOverview />} />
        <Route path="/old/system/:systemId" element={<SystemPageV2 />} />
      </Routes>
    </MemoryRouter>,
  )

/* Radix keeps the unselected panel in the DOM as an empty `hidden` div, so
   "the panel" means the one that is actually shown. */
const shownPanel = (root = document.body) => root.querySelector('[role="tabpanel"]:not([hidden])')

const SYSTEM_ID = SYSTEMS[0].id

const PAGES = [
  {
    name: 'HomeAccountOverview (/old)',
    path: '/old',
    /* Text only the Overview panel carries, and text only the General Info
       panel carries. "General Info" itself is NOT usable here — it is the
       trigger's own label too, so matching it would prove nothing. */
    overviewOnly: /Water events|Demo state:/,
    generalOnly: /No design yet for this tab\./,
  },
  {
    name: 'SystemPage (/old/system/:systemId)',
    path: `/old/system/${SYSTEM_ID}`,
    overviewOnly: /Events Timeline/,
    generalOnly: /General Info tab \(coming\)/,
  },
]

describe.each(PAGES)('$name — the tab row is a real tablist', (page) => {
  it('exposes role="tablist" with role="tab" triggers', () => {
    renderAt(page.path)
    const list = screen.getByRole('tablist')
    expect(list.getAttribute('aria-orientation')).toBe('horizontal')
    const tabs = within(list).getAllByRole('tab')
    expect(tabs.map(t => t.textContent)).toEqual(['Overview', 'General Info'])
  })

  it('reports selection with aria-selected, not just a colour', async () => {
    const user = userEvent.setup()
    renderAt(page.path)

    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'General Info' }).getAttribute('aria-selected')).toBe('false')

    await user.click(screen.getByRole('tab', { name: 'General Info' }))

    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: 'General Info' }).getAttribute('aria-selected')).toBe('true')
  })

  it('associates the shown panel with its trigger, both ways', () => {
    const { container } = renderAt(page.path)
    const overview = screen.getByRole('tab', { name: 'Overview' })
    const panel = shownPanel(container)

    expect(panel).toBeTruthy()
    expect(container.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1)
    expect(overview.getAttribute('id')).toBeTruthy()
    expect(panel.getAttribute('id')).toBeTruthy()
    expect(overview.getAttribute('aria-controls')).toBe(panel.getAttribute('id'))
    expect(panel.getAttribute('aria-labelledby')).toBe(overview.getAttribute('id'))
  })

  it('swaps the panel when the other tab is chosen', async () => {
    const user = userEvent.setup()
    const { container } = renderAt(page.path)

    const first = shownPanel(container)
    expect(first.textContent).toMatch(page.overviewOnly)
    expect(first.textContent).not.toMatch(page.generalOnly)

    await user.click(screen.getByRole('tab', { name: 'General Info' }))

    const second = shownPanel(container)
    expect(second.textContent).toMatch(page.generalOnly)
    expect(second.textContent).not.toMatch(page.overviewOnly)
    // and the panel now belongs to the trigger that was just chosen
    expect(second.getAttribute('aria-labelledby'))
      .toBe(screen.getByRole('tab', { name: 'General Info' }).getAttribute('id'))
    // still exactly one panel on screen
    expect(container.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1)
  })

  /* ONE tab stop for the whole row. Before the change both buttons were
     tabIndex 0, so a keyboard user walked through every trigger on the way
     past the row. Radix puts the row's single tab stop on the TABLIST and
     delegates focus from there to the selected trigger, which is why the
     triggers read -1 until one has been focused. */
  it('costs one tab stop, not one per trigger', () => {
    renderAt(page.path)
    expect(screen.getByRole('tablist').tabIndex).toBe(0)
    expect(screen.getAllByRole('tab').map(t => t.tabIndex)).toEqual([-1, -1])
  })

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup()
    const { container } = renderAt(page.path)

    await user.click(screen.getByRole('tab', { name: 'Overview' }))
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'General Info' }).getAttribute('aria-selected')).toBe('true')
    expect(shownPanel(container).textContent).toMatch(page.generalOnly)
  })

  /* Radix Tabs is allowed inside Phone.jsx's fixed 393x852 frame precisely
     because it does not portal, unlike Select / Popover / Dialog / Tooltip.
     If a future version ever did, this catches it: the row or a panel would
     appear outside the page's own subtree. */
  it('renders the row and the panels inside the page, not through a portal', () => {
    const { container } = renderAt(page.path)
    expect(container.querySelector('[role="tablist"]')).toBeTruthy()
    expect(document.body.querySelectorAll('[role="tablist"]').length)
      .toBe(container.querySelectorAll('[role="tablist"]').length)
    expect(document.body.querySelectorAll('[role="tabpanel"]').length)
      .toBe(container.querySelectorAll('[role="tabpanel"]').length)
  })
})

/* ── The capability neither page uses yet ────────────────────────────────────
   The Figma frame's own three triggers are Overview / Locations (with a count
   badge reading 8) / General Info. Neither page here has a Locations tab and
   none is invented — but the control has to be ABLE to carry one the day the
   owner rules for it, so that is pinned here rather than discovered later. */
describe('the control carries a third trigger and a count badge', () => {
  const ThreeUp = () => (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="locations" aria-label="Locations">
          Locations
          <TabsCount label="8 locations">8</TabsCount>
        </TabsTrigger>
        <TabsTrigger value="general">General Info</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">overview panel</TabsContent>
      <TabsContent value="locations">locations panel</TabsContent>
      <TabsContent value="general">general panel</TabsContent>
    </Tabs>
  )

  it('mounts three tabs and switches between all of them', async () => {
    const user = userEvent.setup()
    const { container } = render(<ThreeUp />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)

    await user.click(screen.getByRole('tab', { name: 'Locations' }))
    expect(shownPanel(container).textContent).toBe('locations panel')

    await user.click(screen.getByRole('tab', { name: 'General Info' }))
    expect(shownPanel(container).textContent).toBe('general panel')
  })

  /* The count is DECORATION on the accessible name. Folding it in once renamed
     "Systems" to "Systems 103" and broke every lookup by name — see PillTabs'
     CountBadge. The number is still announced, as the badge's own label. */
  it('keeps the count off the tab’s accessible name but still announces it', () => {
    render(<ThreeUp />)
    const locations = screen.getByRole('tab', { name: 'Locations' })
    expect(locations.getAttribute('aria-label')).toBe('Locations')
    expect(within(locations).getByLabelText('8 locations').textContent).toBe('8')
  })
})
