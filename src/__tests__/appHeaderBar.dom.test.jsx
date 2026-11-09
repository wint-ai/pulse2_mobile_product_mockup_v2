// @vitest-environment happy-dom
/**
 * AppHeaderBar, rendered DIRECTLY — Figma node 200013:91526.
 *
 * WHY THIS FILE EXISTS AND dashboardHeaderBar.dom.test.jsx IS NOT ENOUGH.
 * That suite asserts the bar THROUGH HomeAllAccounts, which is the only way
 * to test what a page wires. It is also the reason the bar's own contract has
 * repeatedly been unprovable mid-restructure: when the page is being rewritten
 * in the same pass, every assertion about the header fails for the page's
 * reasons and the component's guarantees go unchecked. This file renders the
 * component with explicit props and nothing else, so it stays meaningful while
 * the pages around it move.
 *
 * ── THE ONE THING THIS FILE EXISTS TO PIN ─────────────────────────────────
 * `Switch location` is the accessible name the drawer suites open
 * NavigationDrawer BY (drawerLocationHighlight.dom.test.jsx:66,
 * drawerNestedLocationHighlight:46, scopePersistsThroughDrawer:61), two of
 * them taking the LAST match of a querySelectorAll. It has been broken and
 * restored FOUR times in this project.
 *
 * On 2026-11-07 the PanelLeft nav button was deleted from this bar and its job
 * moved into the More menu. So the invariant this file pins is the NEGATIVE
 * one: THIS COMPONENT MUST NOT ANSWER TO THAT NAME, on any prop combination,
 * including the degenerate ones. If it ever claims it again, two elements on
 * the route wear it, and the three suites above silently address the wrong
 * control. The POSITIVE half - that each route still has exactly one door - is
 * asserted at the route level, where the menu is mounted.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import AppHeaderBar from '@/v2/components/AppHeaderBar'
import i18n from '@/i18n'
import en from '@/i18n/locales/en.json'
import he from '@/i18n/locales/he.json'

afterEach(cleanup)

const bar = (c) => c.querySelector('[data-name="app-header-bar"]')
const back = (c) => c.querySelector('[data-name="app-back"]')
const eyebrow = (c) => c.querySelector('[data-name="app-eyebrow"]')
const title = (c) => c.querySelector('[data-name="app-scope"]')
const more = (c) => c.querySelector('[data-name="app-more"]')

/** The system frame, 200013:91526: back + eyebrow + title + More. */
const full = (over = {}) => ({
  eyebrow: 'Meridian Realty',
  title: 'Meridian Realty Group',
  onBack: vi.fn(),
  backLabel: 'Back to Meridian Realty',
  onOpenMore: vi.fn(),
  moreMenuId: 'more-menu',
  moreLabel: 'More',
  ...over,
})

describe('AppHeaderBar — the node, 200013:91526', () => {
  it('draws back, eyebrow, title and the More badge, and nothing else', () => {
    const { container } = render(<AppHeaderBar {...full()} />)

    expect(bar(container)).toBeTruthy()
    expect(back(container)).toBeTruthy()
    expect(eyebrow(container)).toBeTruthy()
    expect(title(container)).toBeTruthy()
    expect(more(container)).toBeTruthy()

    /* THE TAB ROW IS GONE. It was never this file's - the pages drew it - but
       the whole point of the 2026-11-07 restructure is that the row is
       replaced by the badge above, so a row appearing INSIDE the bar would be
       the regression nobody is watching for. */
    expect(bar(container).querySelectorAll('[role="tablist"]')).toHaveLength(0)
    /* The nav button and the scope pill's caret, both deleted. */
    expect(bar(container).querySelector('[data-name="app-nav"]')).toBeNull()
    expect(bar(container).querySelector('svg.lucide-panel-left')).toBeNull()
    expect(bar(container).querySelector('svg.lucide-chevron-down')).toBeNull()
    /* Older removals that must not come back with the rebuild. */
    expect(bar(container).querySelector('[data-name="app-home"]')).toBeNull()
    expect(bar(container).querySelector('[data-name="app-avatar"]')).toBeNull()
    expect(bar(container).querySelector('img')).toBeNull()
  })

  /* ── THE BADGE'S id ───────────────────────────────────────────────────
     `moreBadgeId` exists because MoreMenu does `getElementById(labelledBy)`
     to MEASURE the real badge, to name itself by it, and to hand focus back
     to it on close. ALL THREE FAIL SILENTLY when the id is absent: the card
     anchors from MORE_MENU_FALLBACK_ANCHOR, focus lands wherever it happened
     to be, and `aria-labelledby` dangles. A screenshot of all three failures
     looks exactly like success, which is how the gap survived two pages —
     both of which worked around it with a mount effect that stamped the id on
     by querySelector. That is why the prop gets its own assertion: nothing
     else in this suite would go red if it stopped being rendered. */
  it('puts `moreBadgeId` on the badge, and nothing else', () => {
    const { container } = render(<AppHeaderBar {...full({ moreBadgeId: 'system-more-badge' })} />)

    expect(more(container).id).toBe('system-more-badge')
    /* ON THE BADGE, not on the bar or the title: the menu measures whatever
       the id resolves to, so an id on the wrong element anchors the card to
       the wrong box without failing anything. */
    expect(document.getElementById('system-more-badge')).toBe(more(container))
    expect(bar(container).id).toBe('')
    expect(title(container).id).toBe('')
  })

  it('renders no id at all when `moreBadgeId` is omitted', () => {
    /* Optional: a caller with no menu passes nothing. React must not emit
       `id="undefined"`, which would resolve for any OTHER caller that then
       looked the same string up. */
    const { container } = render(<AppHeaderBar {...full()} />)
    expect(more(container).hasAttribute('id')).toBe(false)
  })

  it('claims no `Switch location`, on any prop combination', () => {
    /* THE CONTRACT NAME IS THE MORE MENU'S NOW. See this file's header. The
       combinations are enumerated rather than spot-checked because the name
       has come back three different ways already: on the scope pill, on the
       nav button, and on the back control. */
    const cases = [
      full(),
      full({ onBack: undefined }),
      full({ eyebrow: undefined }),
      full({ onOpenMore: undefined }),
      full({ moreLabel: undefined }),
      full({ leading: <span data-testid="bell" /> }),
      { title: 'All accounts' },
    ]
    for (const props of cases) {
      const { container, unmount } = render(<AppHeaderBar {...props} />)
      expect(
        container.querySelectorAll('[aria-label="Switch location"]'),
        'this bar claims the name the drawer suites navigate by',
      ).toHaveLength(0)
      expect(container.querySelectorAll('[title="Switch location"]')).toHaveLength(0)
      /* aria-haspopup="dialog" was how both deleted controls announced the
         drawer. Nothing here opens a dialog any more; the badge opens a menu. */
      expect(container.querySelectorAll('[aria-haspopup="dialog"]')).toHaveLength(0)
      unmount()
    }
  })

  it('the top level draws no back disc and no eyebrow — node 200013:93089', () => {
    const { container } = render(
      <AppHeaderBar title="All accounts" onOpenMore={vi.fn()} moreLabel="More" />,
    )
    expect(back(container)).toBeNull()
    expect(eyebrow(container)).toBeNull()
    expect(title(container).textContent).toBe('All accounts')
    expect(more(container)).toBeTruthy()
  })
})

describe('AppHeaderBar — the back disc, reversed 2026-11-07', () => {
  it('is a 30px disc with a surface fill, not the bare glyph of 2026-11-04', () => {
    /* ⚠ THIS ASSERTION IS A REVERSAL AND IS MEANT TO LOOK LIKE ONE. On
       2026-11-04 the owner rejected a disc here against node 199922:83762:
       "The back arrow doesn't look like in Figma ... It needs to be less
       highlighted", and the test that replaced it pinned `.not.toMatch(/bg-
       card/)`. Node 200013:91526 draws `bg-white border border-solid
       border-white ... size-[30px]` and the owner gave that node as the
       target, so the newer instruction wins and this pins the opposite.

       IF IT IS EVER REVERSED AGAIN it needs a ruling against THIS node, not a
       quote about the old one. The size moves with it: 40 -> 30, which is the
       node's, and which still clears WCAG 2.5.8's 24x24. */
    const { container } = render(<AppHeaderBar {...full()} />)
    const b = back(container)

    expect(b.tagName).toBe('BUTTON')
    expect(b.className).toMatch(/bg-card/)
    expect(b.className).toMatch(/rounded-full/)
    expect(b.className).toMatch(/size-\[30px\]/)
    /* The node's optical nudge - a chevron's ink sits right of its box. */
    expect(b.className).toMatch(/pr-\[2px\]/)

    const glyph = b.querySelector('svg')
    expect(glyph.getAttribute('class')).toMatch(/lucide-chevron-left/)
    expect(glyph.getAttribute('class')).toMatch(/size-\[24px\]/)
  })

  it('paints 30 and is HIT at 44 — WCAG 2.5.5, fixed 2026-11-07', () => {
    /* THE TWO NUMBERS ARE DIFFERENT ON PURPOSE AND BOTH ARE PINNED. The disc
       is the node's 30 and the owner's; 2.5.5 (AAA) asks 44 of the TARGET,
       which is not the same thing as the paint. A transparent ::after carries
       the difference.

       -8 AND NOT -7 IS THE WHOLE ASSERTION. `inset` resolves against the
       containing block's PADDING box — 28px here, because `border` eats 1px a
       side off the 30 — so 28+8+8 = 44 and 28+7+7 = 42. The off-by-one is
       invisible in the DOM and in a screenshot; it is only visible in the
       arithmetic or in elementFromPoint, so it is spelled out here.

       ⚠ A CLASS STRING IS NOT A MEASUREMENT. happy-dom computes no
         pseudo-element geometry, so this file can only pin the recipe. The
         real 44×44 rectangle was measured in Chromium at 393×852 with
         elementFromPoint at all four corners — see the agent report for
         2026-11-07. If the recipe below changes, re-measure; do not reason
         about it from here.

       PADDING WOULD HAVE PASSED A SIZE ASSERTION AND BROKEN THE BAR: it grows
       the border box to 44, the 59px row to 60, and shifts the text column.
       Hence the absence assertions. */
    const { container } = render(<AppHeaderBar {...full()} />)
    const b = back(container)

    expect(b.className).toMatch(/(?:^|\s)relative(?:\s|$)/)
    expect(b.className).toMatch(/after:absolute/)
    expect(b.className).toMatch(/after:content-\[''\]/)
    expect(b.className).toMatch(/after:inset-\[-8px\]/)
    expect(b.className, 'a round hit area leaves the 44 box corners outside it - measured false at all four').not.toMatch(/after:rounded/)

    /* The paint is untouched: still the node's 30, still no ring or fill on
       the hit area. */
    expect(b.className).toMatch(/size-\[30px\]/)
    expect(b.className, 'the hit area started painting').not.toMatch(/after:bg-|after:border|after:ring/)
    /* And the bar did not grow to carry it. */
    expect(b.className, 'padding would push the text column and the 59px row').not.toMatch(/(?:^|\s)p-\[|(?:^|\s)px-\[|(?:^|\s)py-\[|(?:^|\s)p-\d/)
    expect(bar(container).className).toMatch(/py-\[8px\]/)
  })

  it('is named by the caller, and calls back', () => {
    const onBack = vi.fn()
    const { container } = render(<AppHeaderBar {...full({ onBack })} />)
    const b = back(container)
    expect(b.getAttribute('aria-label')).toBe('Back to Meridian Realty')
    fireEvent.click(b)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('defaults its name to `Back` and is not drawn without a handler', () => {
    const { container, unmount } = render(<AppHeaderBar title="X" onBack={vi.fn()} />)
    expect(back(container).getAttribute('aria-label')).toBe('Back')
    unmount()

    const second = render(<AppHeaderBar title="X" />).container
    expect(back(second)).toBeNull()
  })

  it('`leading` wins over the back disc', () => {
    /* /alerts' bell badge is the historical caller: that page's identity mark
       AND its drawer door, and not a back step. Nothing passes it today, so
       this is the assertion keeping the slot alive. */
    const { container, getByTestId } = render(
      <AppHeaderBar {...full({ leading: <span data-testid="bell">bell</span> })} />,
    )
    expect(getByTestId('bell')).toBeTruthy()
    expect(back(container), 'the back disc is drawn beside an explicit leading node').toBeNull()
  })
})

describe('AppHeaderBar — the text column', () => {
  it('the eyebrow is the parent scope plus the frame\'s trailing ›', () => {
    const { container } = render(<AppHeaderBar {...full()} />)
    const e = eyebrow(container)
    expect(e.tagName).toBe('P')
    /* The glyph is the frame's and is composed here, not asked of the caller.
       Pinned as textContent because a caller that starts passing its own ›
       would double it, and that reads as a broken crumb rather than as a
       stray character. */
    expect(e.textContent).toBe('Meridian Realty ›')
    expect(e.className).toMatch(/text-muted-foreground/)
    expect(e.className).toMatch(/text-\[12px\]/)
    expect(e.className).toMatch(/leading-\[18px\]/)
    /* Figtree, not Geist - the one slot in this bar that is the body family. */
    expect(e.className).toMatch(/font-sans/)
    expect(e.className).not.toMatch(/font-mono-label/)
  })

  it('the title is 18px Geist, left, truncating, and inert', () => {
    /* THE SIZE DROPPED 20 -> 18 with the node. The 20 was a 2026-11-04 scale
       decision made while this text sat on photographic artwork, where WCAG's
       18.66px-bold boundary bought it 3:1 instead of 4:1. The bar is on the
       page ground now and the boundary buys nothing, so the node's 18 costs
       no contrast argument.

       INERT IS THE OWNER'S STANDING RULING, 2026-11-04: "remove this and the
       arrow - only the icon open the nav bar", with "We still have title that
       shows what selected". Checked structurally rather than by firing a
       click, because "nothing happened" is also what a broken handler looks
       like. */
    const { container } = render(<AppHeaderBar {...full()} />)
    const t = title(container)

    expect(t.tagName).toBe('P')
    expect(t.textContent).toBe('Meridian Realty Group')
    expect(t.className).toMatch(/font-mono-label/)
    expect(t.className).toMatch(/font-semibold/)
    expect(t.className).toMatch(/text-\[18px\]/)
    expect(t.className).toMatch(/leading-\[24\.75px\]/)
    expect(t.className).toMatch(/tracking-\[-0\.45px\]/)
    expect(t.className).toMatch(/text-slate-800/)
    expect(t.className).toMatch(/text-left/)
    expect(t.className).toMatch(/truncate/)

    expect(t.getAttribute('role')).toBeNull()
    expect(t.getAttribute('tabindex')).toBeNull()
    expect(t.getAttribute('aria-haspopup')).toBeNull()
    expect(t.getAttribute('aria-label')).toBeNull()
    expect(t.closest('button'), 'the readout is inside a control again').toBeNull()
    expect(t.className, 'it presents as pressable').not.toMatch(/cursor-pointer/)
  })

  it('keeps `label` working as an alias for `title`', () => {
    /* Three call sites still spell `label`. Renaming a prop and its callers in
       the same pass as a rebuild is two changes wearing one diff. */
    const { container } = render(<AppHeaderBar label="Office" onOpenMore={vi.fn()} />)
    expect(title(container).textContent).toBe('Office')
  })

  it('prefers `title` when both are passed', () => {
    const { container } = render(<AppHeaderBar title="New" label="Old" />)
    expect(title(container).textContent).toBe('New')
  })
})

describe('AppHeaderBar — the More badge', () => {
  it('is a real button wearing the shadcn outline Badge', () => {
    /* The node's own component note maps this to components/ui/badge.jsx at
       variant="outline". A Badge is a <div> there and this repo's copy takes
       no asChild, so the variant's classes are composed onto a real button:
       same classes, one element, and a control that can be focused, named and
       announced. */
    const { container } = render(<AppHeaderBar {...full()} />)
    const m = more(container)

    expect(m.tagName).toBe('BUTTON')
    expect(m.getAttribute('type')).toBe('button')
    /* badgeVariants' own base and outline variant, i.e. the node's px-8 /
       py-2 / gap-4 / 12px / Medium / slate-900, not restated by hand. */
    expect(m.className).toMatch(/px-2/)
    expect(m.className).toMatch(/py-0\.5/)
    expect(m.className).toMatch(/gap-1/)
    expect(m.className).toMatch(/text-xs/)
    expect(m.className).toMatch(/font-medium/)
    expect(m.className).toMatch(/text-foreground/)
    /* What the node adds on top. */
    expect(m.className).toMatch(/h-\[24px\]/)
    expect(m.className).toMatch(/rounded-\[26px\]/)
    expect(m.className).toMatch(/border-slate-600/)
  })

  it('reads `More` in Geist, with a 12px hamburger in a 16px box', () => {
    const { container } = render(<AppHeaderBar {...full()} />)
    const m = more(container)

    expect(m.textContent).toBe('More')

    /* ⚠ THE FAMILY IS ON THE SPAN, NOT THE BUTTON, and that is load-bearing:
       src/index.css:921 carries an UNLAYERED `button { font-family: inherit }`
       and unlayered CSS beats @layer utilities, so `font-mono-label` on the
       <button> is silently overridden and the badge renders in Figtree.
       Measured in a browser at 393x852 before this was written. Moving the
       class up onto the button would pass every class-string assertion and
       change the rendered font. */
    const label = m.querySelector('span.font-mono-label')
    expect(label, 'the Geist family moved onto the <button>, where it does not apply').toBeTruthy()
    expect(label.textContent).toBe('More')

    const box = m.querySelector('[data-name="app-more-icon"]')
    expect(box.className).toMatch(/size-\[16px\]/)
    const glyph = box.querySelector('svg')
    expect(glyph.getAttribute('class')).toMatch(/lucide-menu/)
    expect(glyph.getAttribute('class')).toMatch(/size-\[12px\]/)
  })

  /* ── WCAG 2.5.3 LABEL IN NAME, fixed 2026-11-07 ────────────────────────
     The badge used to render the node's hard-coded English `More` while the
     caller handed `moreLabel` the translated `t('tabs.more')`. In `en` the
     two are the same word, so nothing was visible; in `he` the badge READ
     `More` and ANNOUNCED `עוד` — the visible label was not contained in the
     accessible name, which is exactly the failure 2.5.3 names, and it broke
     voice control in the one locale that has a translation.

     These assert the FIX AS A RULE: both halves resolve from ONE catalogue
     entry. Spelled against the catalogue rather than against the literals so
     a retranslation of `tabs.more` cannot turn a correct badge red — and
     `en.tabs.more` is separately pinned to be the node's word, which is the
     thing a retranslation must not change. */
  it('renders the catalogue word, not a hard-coded English literal', () => {
    /* The node's literal and the catalogue agree in `en` — that is why this
       hid for a day — so the en case is asserted through the key. */
    expect(en.tabs.more, 'the catalogue drifted from the node').toBe('More')

    const { container } = render(<AppHeaderBar {...full()} />)
    const label = more(container).querySelector('span.font-mono-label')
    expect(label.textContent).toBe(en.tabs.more)
  })

  it('follows the locale, so the visible word and the announced one are one string', async () => {
    expect(he.tabs.more, 'he.json lost its translation of tabs.more').toBeTruthy()
    expect(he.tabs.more).not.toBe(en.tabs.more)

    await i18n.changeLanguage('he')
    try {
      /* The caller passes the SAME catalogue entry it always did. Nothing
         about the prop contract moved for this fix — see the component. */
      const { container } = render(<AppHeaderBar {...full({ moreLabel: i18n.t('tabs.more') })} />)
      const m = more(container)

      expect(m.textContent, 'the badge still renders English under he').toBe(he.tabs.more)
      expect(m.getAttribute('aria-label')).toBe(he.tabs.more)
      /* 2.5.3 proper: the accessible name CONTAINS the visible label. */
      expect(m.getAttribute('aria-label')).toContain(m.textContent)
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  it('falls back to the catalogue word in the active locale when nothing names it', async () => {
    /* Left unnamed the accessible name IS the visible text, so the fallback
       path has to be translated too or the gap reopens one prop later. */
    await i18n.changeLanguage('he')
    try {
      const { container } = render(<AppHeaderBar {...full({ moreLabel: undefined })} />)
      expect(more(container).getAttribute('aria-label')).toBeNull()
      expect(more(container).textContent).toBe(he.tabs.more)
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  it('announces a menu, its state and the menu it controls', () => {
    const { container, rerender } = render(<AppHeaderBar {...full({ moreOpen: false })} />)
    let m = more(container)

    expect(m.getAttribute('aria-haspopup')).toBe('menu')
    expect(m.getAttribute('aria-expanded')).toBe('false')
    /* ⚠ aria-controls IS EMITTED WHILE CLOSED on purpose. axe-core's
       aria-valid-attr-value exempts an aria-controls whose target is absent
       when aria-expanded is "false", precisely so a trigger can name what it
       will create. The pair is what makes it legal, so the two must stay
       together - dropping aria-expanded turns this into a dangling idref. */
    expect(m.getAttribute('aria-controls')).toBe('more-menu')

    rerender(<AppHeaderBar {...full({ moreOpen: true })} />)
    m = more(container)
    expect(m.getAttribute('aria-expanded')).toBe('true')
    expect(m.getAttribute('aria-controls')).toBe('more-menu')
  })

  it('takes its accessible name from the caller, and from its own text when it is not given', () => {
    /* The caller passes the TRANSLATED string so this file holds no copy of
       its own; `tabs.more` is the catalogue entry and is exactly `More` in en.
       Left undefined the name comes from the visible text, which is the same
       word, so a caller that forgets is not left with an unnamed control. */
    const { container, unmount } = render(<AppHeaderBar {...full({ moreLabel: 'More' })} />)
    expect(more(container).getAttribute('aria-label')).toBe('More')
    unmount()

    const second = render(<AppHeaderBar {...full({ moreLabel: undefined })} />).container
    expect(more(second).getAttribute('aria-label')).toBeNull()
    expect(more(second).textContent, 'nothing names the badge at all').toBe('More')
  })

  it('is not drawn without a handler, and calls it when it is', () => {
    const onOpenMore = vi.fn()
    const { container, unmount } = render(<AppHeaderBar {...full({ onOpenMore })} />)
    fireEvent.click(more(container))
    expect(onOpenMore).toHaveBeenCalledTimes(1)
    unmount()

    const second = render(<AppHeaderBar {...full({ onOpenMore: undefined })} />).container
    expect(more(second)).toBeNull()
  })
})

describe('AppHeaderBar — the collapsing header is gone', () => {
  it('owns no scroll machinery, no band and no z-index', () => {
    /* The 2026-11-04 collapse is retired: these frames paint the wave inside
       an inset hero card, so there is no full-bleed band behind this bar to
       reclaim height from. The mechanism's fingerprints are --hdr-t on an
       element, a clip-path, and a z-index on the bar itself. None of them may
       reappear here; the file header says what replaced them and why. */
    const { container } = render(<AppHeaderBar {...full()} />)
    const b = bar(container)

    expect(b.getAttribute('style') || '').not.toMatch(/--hdr-t|clip-path/)
    expect(b.className, 'the bar took a z-index back').not.toMatch(/(?:^|\s)z-(?:\[\d+px?\]|[1-9]\d*)(?:\s|$)/)
    expect(b.className, 'the bar paints its own ground again').not.toMatch(/absolute|fixed/)
    /* It is an ordinary static row: the page gives it the 16px gutter. */
    expect(b.className).toMatch(/py-\[8px\]/)
    expect(b.className).not.toMatch(/px-\[10px\]/)
  })

  it('passes className through, so a page can still place it', () => {
    const { container } = render(<AppHeaderBar {...full({ className: 'px-4' })} />)
    expect(bar(container).className).toMatch(/px-4/)
  })
})

/* ── THE SURFACE VARIANTS — 2026-11-09 ─────────────────────────────────────
   Nodes 200067:38981 (Home), 200047:135462 (General info) and 200067:37938
   (System). ONE BAR, THREE GROUNDS: the owner's 2026-11-04 ruling is that the
   header "always needs to be the same", so what varies is the leading slot,
   the title shape and the ground - never the skeleton, and never a second
   component. These tests pin that the skeleton really does not move, and that
   the DEFAULT is still the bar every existing call site already renders. */
const veil = (c) => c.querySelector('[data-name="app-header-veil"]')
const leadingGroup = (c) => c.querySelector('[data-name="app-header-leading"]')

describe('AppHeaderBar — the surface is additive, and `ground` is the old bar', () => {
  /* THE WHOLE POINT OF THE PROP. Seven files import this component and none of
     them was edited for this change, so `surface` left unset must produce the
     bar they were written against - not merely a similar one. Asserted as the
     ABSENCE of every new fingerprint rather than as a snapshot, because a
     snapshot would go green again the moment someone re-blessed it. */
  it('defaults to `ground` and adds nothing a call site did not ask for', () => {
    const { container } = render(<AppHeaderBar {...full()} />)
    const b = bar(container)

    expect(b.dataset.surface).toBe('ground')
    expect(veil(container), 'the default bar grew a veil').toBeNull()
    expect(b.className).not.toMatch(/rounded-full/)
    expect(b.className).not.toMatch(/backdrop-blur/)
    expect(b.className, 'the default bar grew a position').not.toMatch(/relative/)
    /* No inline background: `ground` paints no ground at all, which is what
       "a plain static bar on the page ground" means. */
    expect(b.getAttribute('style') || '').not.toMatch(/background/)
    /* The two inks the shipped bar uses, unchanged. */
    expect(title(container).className).toMatch(/text-slate-800/)
    expect(eyebrow(container).className).toMatch(/text-muted-foreground/)
    /* The outline Badge, not the frames' white pill. */
    expect(more(container).className).toMatch(/border-slate-600/)
    expect(more(container).className).not.toMatch(/bg-card/)
  })

  /* `surface` is spelled by name at three call sites' worth of future pages,
     so an unknown value must degrade to the safe ground rather than throw or
     render a half-chip. */
  it('treats an unknown surface as the ground', () => {
    const { container } = render(<AppHeaderBar {...full({ surface: 'wat' })} />)
    expect(bar(container).className).not.toMatch(/rounded-full/)
    expect(veil(container)).toBeNull()
    expect(title(container).className).toMatch(/text-slate-800/)
  })

  it('`onColor` draws the frames\' veil, light ink and white pill', () => {
    const { container } = render(
      <AppHeaderBar {...full({ surface: 'onColor', surfaceTint: 'rgba(217,96,100,0.76)' })} />,
    )
    const b = bar(container)
    const v = veil(container)

    expect(b.dataset.surface).toBe('onColor')
    expect(b.className).toMatch(/rounded-full/)
    /* The blur is asserted ON THE VEIL below, not here - see "keeps the
       backdrop filter off the root" for why the root must not carry one. */
    /* 200067:37938's veil, atom for atom. */
    expect(v, 'no veil on an onColor surface with a tint').toBeTruthy()
    expect(v.className).toMatch(/absolute/)
    expect(v.className).toMatch(/inset-0/)
    expect(v.className).toMatch(/mix-blend-multiply/)
    expect(v.style.backgroundColor).toBeTruthy()

    /* ⚠ THE VEIL MUST NOT EAT TAPS. It covers the whole bar, so without
       `pointer-events-none` the back disc and the More badge both stop
       answering while a screenshot stays perfect - the same invisible
       dead-tap the tab bar's opaque strip caused. happy-dom does no hit
       testing, so this is asserted on the class and on aria-hidden rather
       than with elementFromPoint; the browser pass is where it was actually
       clicked. */
    expect(v.className, 'the veil is a tap sponge over both controls').toMatch(/pointer-events-none/)
    expect(v.getAttribute('aria-hidden')).toBe('true')

    /* The ink goes light, and the WHOLE text column goes with it - the frame
       has no muted grey on a tinted hero. */
    expect(title(container).className).toMatch(/text-ink-on-color/)
    expect(title(container).className).not.toMatch(/text-slate-800/)
    expect(eyebrow(container).className).toMatch(/text-ink-on-color/)
    expect(eyebrow(container).className).not.toMatch(/text-muted-foreground/)

    /* The badge becomes the frames' white pill. */
    expect(more(container).className).toMatch(/bg-card/)
    expect(more(container).className).toMatch(/border-transparent/)
  })

  /* ⚠ THE PAINTING-ORDER FIX, AND IT IS THE ONE THAT LOOKS LIKE TIDINESS.
     CSS paints positioned descendants after non-positioned ones regardless of
     DOM order. The veil is absolute; the leading group and the badge are plain
     flex items. Without `relative` on those two the veil paints OVER them,
     `mix-blend-multiply` multiplies the white title by the tint, and the title
     vanishes into the hero. Both Figma frames carry `relative` on their content
     children for this reason. If anyone strips it as redundant, nothing else
     in this suite goes red. */
  it('lifts the content above the veil with position, never with z-index', () => {
    const { container } = render(
      <AppHeaderBar {...full({ surface: 'onColor', surfaceTint: '#9dbbd9' })} />,
    )

    expect(leadingGroup(container).className, 'the text column sank under the veil').toMatch(/relative/)
    expect(more(container).className, 'the More badge sank under the veil').toMatch(/relative/)

    /* AND NOT WITH A z-index, on any of the three. A positive z-index anywhere
       in this bar is what silently deletes the floating tab bar, because every
       positive z-index paints after every auto one regardless of DOM order. */
    const Z = /(?:^|\s)z-(?:\[\d+px?\]|[1-9]\d*)(?:\s|$)/
    expect(bar(container).className).not.toMatch(Z)
    expect(leadingGroup(container).className).not.toMatch(Z)
    expect(more(container).className).not.toMatch(Z)
    expect(veil(container).className).not.toMatch(Z)
  })

  /* ── THE BACKDROP-ROOT TRAP — REGRESSION, FIXED 2026-11-09 ──────────────
     `backdrop-blur-[3.5px]` was on the CHIP ROOT as well as on the veil for one
     afternoon, and it silently killed the blend on every on-colour surface.
     An element with `backdrop-filter` is a BACKDROP ROOT and a stacking
     context, which ISOLATES a descendant's `mix-blend-mode`: the veil then
     multiplied against the root's own transparent background and emitted its
     source colour unchanged, so the bar painted a flat band instead of a tint
     of the hero.

     ⚠ THIS SUITE DID NOT CATCH IT AND COULD NOT HAVE. Every class name was
       spelled right and every computed style was right - `mix-blend-multiply`
       really was `multiply`, the veil really was over the hero. Only the
       COMPOSITED PIXEL was wrong, and happy-dom composites nothing. Measured
       in Chromium over HomeAllAccounts' hero, same sample point, one variable:

         hero behind the bar            #3c8ef9
         predicted multiply(tint, hero) #2568d4
         root backdrop-filter: none     #2568d3   <- correct, off by 1
         root backdrop-filter: blur()   #9dbbd9   <- the raw tint, flat

     So what is pinned here is the STRUCTURAL PRECONDITION the pixel depends
     on: the blur belongs to the blending element, never to an ancestor of it.
     That is also exactly what nodes 200067:38981 and 200067:37938 do. */
  it('keeps the backdrop filter off the root, or the veil stops multiplying', () => {
    const { container } = render(
      <AppHeaderBar {...full({ surface: 'onColor', surfaceTint: '#9dbbd9' })} />,
    )

    expect(
      bar(container).className,
      'a backdrop filter on the root makes it a backdrop root, which isolates '
        + 'the veil\'s mix-blend-multiply - the bar then paints the raw tint flat. '
        + 'The blur belongs on the veil, which already carries it.',
    ).not.toMatch(/backdrop-blur/)

    /* And nothing is lost: the veil still blurs, and still blends. */
    expect(veil(container).className).toMatch(/backdrop-blur-\[3\.5px\]/)
    expect(veil(container).className).toMatch(/mix-blend-multiply/)
  })

  /* `muted` IS ALLOWED THE ROOT BLUR, and this is not an inconsistency - it is
     200047:135462, which has NO veil child and NO blend anywhere beneath it, so
     there is nothing for a backdrop root to isolate. Pinned so the fix above is
     not "completed" by stripping the blur from this surface too. */
  it('still blurs on the root for `muted`, which has no blend to isolate', () => {
    const { container } = render(
      <AppHeaderBar {...full({ surface: 'muted', surfaceTint: '#dae1eb' })} />,
    )
    expect(bar(container).className).toMatch(/backdrop-blur-\[3\.5px\]/)
    expect(veil(container), '`muted` must have no veil - nothing to isolate').toBeNull()
    expect(bar(container).className).not.toMatch(/mix-blend/)
  })

  /* NO TINT, NO COLOUR INVENTED. A missing tint has to look unfinished rather
     than plausible, so the veil is simply not drawn - the alternative is this
     file holding a hero colour, which is what "one header" argues against. */
  it('paints no veil and no background when `surfaceTint` is omitted', () => {
    const { container } = render(<AppHeaderBar {...full({ surface: 'onColor' })} />)
    expect(veil(container)).toBeNull()
    expect(bar(container).getAttribute('style') || '').not.toMatch(/background/)
    /* The chip geometry still arrives - only the colour is withheld. */
    expect(bar(container).className).toMatch(/rounded-full/)
  })

  it('`muted` is an opaque tint with dark ink and no multiply', () => {
    /* 200047:135462 is the one frame with NO veil child and NO
       mix-blend-multiply: it paints its #dae1eb directly. Its title ink is
       #45556c, which is --slate-600 exactly - a third value, neither the
       shipped slate-800 nor the on-colour white. */
    const { container } = render(
      <AppHeaderBar {...full({ surface: 'muted', surfaceTint: '#dae1eb' })} />,
    )

    expect(bar(container).dataset.surface).toBe('muted')
    expect(veil(container), '`muted` must not multiply - the frame has no veil').toBeNull()
    expect(bar(container).style.backgroundColor).toBeTruthy()
    expect(bar(container).className).toMatch(/rounded-full/)
    expect(title(container).className).toMatch(/text-slate-600/)
    expect(more(container).className).toMatch(/bg-card/)
  })

  /* THE SKELETON DOES NOT MOVE. This is the owner's ruling stated as a test:
     every surface draws the same three slots, in the same order, with the same
     vertical padding. If a variant ever starts adding or dropping a slot it has
     become a second header wearing one name. */
  it('draws the same skeleton on every surface', () => {
    for (const surface of ['ground', 'muted', 'onColor']) {
      cleanup()
      const { container } = render(
        <AppHeaderBar {...full({ surface, surfaceTint: '#dae1eb' })} />,
      )
      const b = bar(container)

      expect(back(container), `${surface} lost the back disc`).toBeTruthy()
      expect(eyebrow(container), `${surface} lost the eyebrow`).toBeTruthy()
      expect(title(container), `${surface} lost the title`).toBeTruthy()
      expect(more(container), `${surface} lost the More badge`).toBeTruthy()
      /* Same row, same vertical rhythm. 200067:37938 spells `p-[8px]` and the
         other two `px-[11px] py-[8px]`; the bar takes py-8 on all three so the
         height is one number. */
      expect(b.className, `${surface} changed the bar's vertical padding`).toMatch(/py-\[8px\]/)
      /* Never absolute or fixed, on any surface: the page places this bar. */
      expect(b.className, `${surface} paints its own ground`).not.toMatch(/absolute|fixed/)
      /* And the title stays a readout on every one of them - the 2026-11-04
         ruling does not have a surface exemption. */
      expect(title(container).closest('button'), `${surface} made the title pressable`).toBeNull()
    }
  })
})
