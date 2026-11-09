/**
 * phoneStatusBar — the simulated status band's contract, shared between the
 * shell that draws it and the screens that paint behind it.
 *
 * WHY THIS IS A SEPARATE FILE AND NOT PART OF Phone.jsx. Phone.jsx default-
 * exports a component, and `react-refresh/only-export-components` is an ERROR
 * in this repo's config: a file that exports both a component and a constant
 * or a hook breaks Fast Refresh. Putting the constant and the hook here is the
 * same split the repo already uses for `tabBarMetrics.js` beside TabBar.jsx
 * and `moreMenuModel.js` beside MoreMenu.jsx.
 *
 * ── WHAT THIS EXISTS TO SOLVE ─────────────────────────────────────────────
 * Every frame in the 2026-11 set runs the coloured hero all the way to the top
 * edge of the screen, BEHIND the clock and battery. The shell could not express
 * that: the band was a `flexShrink: 0` flex SIBLING ABOVE the route, and the
 * phone frame is `overflow: hidden`, so a page reaching upward with a negative
 * margin painted OVER the glyphs rather than behind them. The Home page hit
 * exactly this and correctly stopped - see the "WHAT THIS CANNOT REACH" block
 * in HomeAllAccounts.jsx.
 *
 * Phone.jsx now splits the band into the two jobs it was conflating:
 *
 *   · THE SEAT   an in-flow, STATUS_BAR_HEIGHT-tall spacer carrying
 *                `theme.statusBarBg`. It is what holds every route where it
 *                already is. Rendered unless a screen opts out.
 *   · THE GLYPHS an absolutely positioned overlay, LAST in DOM order, holding
 *                the clock and the battery and no background.
 *
 * Seat + glyphs is pixel-identical to the single element it replaced, so no
 * screen moves and no screen changes colour. But because the glyphs are now
 * positioned and come last, anything a page paints into the band is drawn
 * BEHIND them instead of over them - which is the whole point.
 *
 * ── THE FRAMES, CHECKED RATHER THAN ASSUMED ───────────────────────────────
 * Nodes 200067:38971 (Home) and 200059:35849 (System) are structurally
 * identical and BOTH have NO BACKGROUND on the strip - the frames do not tint
 * this band at all, they let the artwork show through.
 *
 * ⚠ THEY DISAGREE ON THE INK, AND THAT IS WHY `ink` IS A PARAMETER. Home paints
 *   the clock and battery `white`; System paints them `#1e2a3b`. The briefing
 *   note for this change said the glyphs "stay DARK and are not inverted to
 *   white" - that is true of the System frame and FALSE of the Home frame. One
 *   constant cannot serve both, so the screen that knows what is behind the
 *   glyphs chooses.
 */
import { createContext, useContext, useLayoutEffect } from 'react'

/**
 * The simulated status band's height. 44, unchanged.
 *
 * ⚠ THE FRAMES SAY 48, AND IT IS DELIBERATELY NOT TAKEN. Both status nodes sit
 * in a 48px band with `px-[28px]` and a 15px Figtree SemiBold clock; this strip
 * is 44 / 24 / 14. Adopting the frame's numbers would push every one of the 17+
 * screens on this shell down by 4px and move the glyphs, which is exactly the
 * "no other screen may move" line this change is held to. The deviation is
 * recorded rather than fixed; taking it is a separate, deliberate change.
 */
export const STATUS_BAR_HEIGHT = 44

/** Phone.jsx provides `{ set }`; a tree without the shell gets null and the
    hook below becomes a no-op rather than throwing. */
export const StatusBarContext = createContext(null)

/**
 * Opt a screen into painting behind the status glyphs.
 *
 *   useStatusBarBleed({ bleed: true, ink: 'var(--ink-on-color)' })   // Home
 *   useStatusBarBleed({ bleed: true, ink: 'var(--color-slate-800)' })// System
 *
 * ADDITIVE AND OPT-IN. A screen that never calls this gets today's rendering
 * exactly: the seat is reserved, the band wears `theme.statusBarBg`, and the
 * glyphs wear `--status-bar-ink`. There is no opt-OUT to add anywhere, which is
 * the property that makes this safe on a shell with 17+ screens on it.
 *
 * WHAT `bleed: true` DOES: drops the seat, so the route starts at y=0 and the
 * page's own hero ARTWORK - not a flat colour - fills the band.
 *
 * ⚠ THE CALLING PAGE STILL OWNS ITS OWN TOP INSET. Dropping the seat moves the
 *   whole route up by STATUS_BAR_HEIGHT, so a page that wants its header chip
 *   to stay put must add that 44 back as padding on the content that should NOT
 *   bleed. On the Home frame the chip's content sits at y=59 under a 48px band,
 *   i.e. 11px of gap; against this shell's 44 that is `pt-[55px]` on the chip
 *   seat where it currently spells `pt-[11px]`. This file cannot do it for the
 *   page: only the page knows which of its children bleed and which do not.
 *
 * ⚠ CONTRAST IS THE CALLER'S, AND IT IS NOT DECORATIVE. These glyphs are the
 *   only text in the app that sits on whatever artwork a hero puts under it. A
 *   hero recolour can take them below 4.5:1 and nothing here will notice,
 *   because this file does not know what is behind it.
 *
 * `useLayoutEffect` rather than `useEffect` so the seat is gone before the first
 * paint; with `useEffect` the band flashed `statusBarBg` for one frame on every
 * entry to a bleeding route. Reset on unmount, so leaving the route restores the
 * seat and the default ink - without that, every screen navigated to after Home
 * would inherit Home's bleed and start 44px too high, which is the regression
 * this whole mechanism exists to avoid.
 */
export function useStatusBarBleed(options) {
  const ctx = useContext(StatusBarContext)
  const set = ctx ? ctx.set : null
  const bleed = options?.bleed ?? true
  const ink = options?.ink

  /* DEPENDS ON `set`, NOT ON `ctx`. `set` is useState's setter and React
     guarantees it is stable; `ctx` changes identity whenever `bandHeight` does,
     i.e. on every resize across the 500px boundary. Depending on the object
     would re-run this effect on those resizes for no reason - and since the
     effect calls `set`, that is a re-render feeding the thing that triggered
     it. */
  useLayoutEffect(() => {
    if (!set) return undefined
    set({ bleed, ink })
    return () => set({ bleed: false, ink: undefined })
  }, [set, bleed, ink])

  /* ── WHAT THE SHELL REPORTS BACK — ADDITIVE, 2026-11-09 ─────────────────
     Existing callers ignore the return value and are unaffected; this only
     adds. It exists to delete a duplication: HomeAllAccounts and SystemHeroCard
     had both copied Phone's `innerWidth <= 500 || mobile UA` predicate inline,
     because the page must know whether a band is drawn at all before it pays
     the 44px back as padding - and `@/hooks/use-mobile` is the WRONG predicate
     for it (`< 768`, so the two disagree between 501 and 767, and taking that
     one puts an 11px inset under a band that IS drawn).

     `statusBarHeight` is the band's height on this shell path: 44 where a band
     is drawn, 0 on MobileLayout, which draws none.

     `bandDrawn` is simply that as a boolean - the direct replacement for the
     mirrored predicate.

     `inset` is the number a page actually wants: what it must add back to the
     content that should NOT bleed. It already accounts for both the shell path
     and whether this screen asked to bleed, so a page can spell
     `paddingTop: inset + 11` and be right at every width and on both paths,
     with no 55 and no predicate of its own. */
  const statusBarHeight = ctx ? ctx.bandHeight : 0
  return {
    statusBarHeight,
    bandDrawn: statusBarHeight > 0,
    inset: bleed ? statusBarHeight : 0,
  }
}
