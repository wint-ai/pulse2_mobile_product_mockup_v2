/**
 * Switch profile — /select.
 *
 * THIS SCREEN IS LIVE, not dead code. It is reached from two places inside
 * the app: WintSidebarV2.jsx's profile row (`go('/select')`) and
 * AccountScreenV2.jsx's "Switch profile" button (`navigate('/select')`), and
 * routeSmoke.dom.test.jsx mounts it as one of its route cases. It sits inside
 * LoginGate, so it is only reachable once a persona has already been picked —
 * which is exactly what it is for.
 *
 * ⚠ IT IS ALSO WHERE "SIGN OUT" LANDS, which is why the owner calls it the
 * logged-out screen. AccountScreenV2.switchProfile() does `setPersona(null)`
 * then `navigate('/select', { replace: true })` and does NOT clear
 * `pulse2-auth`. So from the user's seat: tap Sign out, arrive here, choose a
 * role. That is "logged out, choosing the user roles", and it is the screen
 * both 2026-11-10 instructions below are about.
 *
 * ── REBUILT ONTO THE DESIGN SYSTEM — 2026-11-10 ───────────────────────────
 * Owner, over a screenshot of this screen: "you need to fix this screen to be
 * looks as part of the design system. It looks from different app. I don't
 * like it."
 *
 * WHAT WAS FOREIGN, and what each piece is now:
 *
 *   a flat, square-cornered `bg-primary` band, full width, hard bottom edge,
 *   no artwork
 *     -> <HeroCardShell tone="brand">, the chassis every other hero in this
 *        app uses: the wave raster, the 22px radius, the coloured top butted
 *        onto a white body under ONE clip. The same component and the same
 *        `tone` the location screen's hero passes.
 *
 *   a tinted blue info callout (`border-primary/25 bg-secondary`) for the
 *   More hint
 *     -> the house card row. Same chassis as the profile cards under it
 *        (`rounded-[18px] border-card bg-surface-card`) and the same 40px
 *        `bg-secondary text-primary` glyph tile, minus the chevron, because
 *        it is not a control. The INFORMATION is untouched — it is the
 *        owner's own guidance that More switches profile — only its dress is.
 *
 *   full-bleed content against the frame edge
 *     -> 16px gutters, the app's card inset.
 *
 * NO FIGMA SOURCE, and none was given: the delivery canvas has no sign-in or
 * persona frame (verified at PersonaPicker.jsx's header against the page
 * listing) and none of the 2026-11-09 batch covers this screen. So the source
 * of truth here is the app's own shipped components, per the project rule
 * that a screenshot is never a spec. Every element below is an existing
 * component or an existing chassis; nothing is drawn from the picture.
 *
 * NOTHING IS REMOVED. Three roles, each landing in the right persona, the
 * wordmark, the title, the subtitle, the More hint and the footer are all
 * still here. Only the chassis under them changed.
 *
 * ── THE FLEET-STATE CONTROL — 2026-11-10 ──────────────────────────────────
 * Owner: "every time I'm logged out, and I'm choosing the user roles, I want
 * to see this flag if I want to see clear or with error. And currently it's
 * not the situation."
 *
 * <FleetStateChoice> sits in the hero's WHITE BODY — the first thing under
 * the title, above the roles, visible on every visit with no disclosure to
 * open. It is the same component the cold sign-in screen mounts (App.jsx's
 * LoginGate), which is the other half of "every time": the control existed
 * there and only there, so a user who signed out and came back here never saw
 * it. See src/components/FleetStateChoice.jsx for what it writes and why.
 *
 * THE HERO BODY IS ITS SEAT ON PURPOSE. The choice reframes every card below
 * it — same three personas, same entities, a different present — so it reads
 * as part of the header that names the demo, not as a fourth option in the
 * list of roles.
 *
 * ── CONTRAST ON THE ARTWORK, MEASURED ─────────────────────────────────────
 * Chromium, both shell paths (393 MobileLayout and 900 DesktopFrame), ink
 * hidden before sampling, worst pixel inside each run's OWN glyph rect - no
 * brightness threshold and no channel mask, per the house method. The two
 * shell paths agree to within 0.02 everywhere, because the card is inset and
 * the status band is above it.
 *
 *                                      light   dark   contrast
 *     wordmark (white cut, graphic)     3.44    3.18     3.18
 *     "Choose your profile" 16px/700    5.19    4.86     1.80
 *     subline 14px/400                  3.41    3.12     1.89
 *     "What you'll see" 12.5px/700     17.21   15.75     2.01
 *     fleet-state hint 11px/400         4.60    6.27     1.02
 *
 * WHAT PASSES: the title clears 4.5:1 in both real themes, and everything in
 * the WHITE BODY clears it in both. The wordmark is a brand mark and carries
 * no contrast requirement (WCAG 1.4.3 exempts text that is part of a logo).
 *
 * WHAT DOES NOT, AND WHY IT IS REPORTED RATHER THAN FIXED: the 14px subline
 * is under 4.5:1 on the artwork. That is the standing condition of every
 * hero in this app, not something this screen introduced - HeroCardShell's
 * header records the same measurement for the location hero ("12 Locations"
 * at 3.35/3.04) and the same ruling: the copy is what the designer drew, a
 * veil is explicitly off the table, and the call is the owner's. This screen
 * is BETTER placed than the one that ruling was written for, not worse: its
 * title clears, and it dropped the /70 alpha the old solid band used, which
 * was costing it a further point.
 *
 * THE `contrast` COLUMN IS THE KNOWN THEME DEFECT, not a new one.
 * --ink-on-color inverts to a dark indigo under `contrast` while the raster
 * stays mid-blue, so darkening the ground moves the ink TOWARDS it. The
 * location hero reads 2.48 under the identical mechanism and HeroCardShell
 * says where the fix belongs ("either `contrast` keeps white on artwork the
 * way the system hero already does, or the token changes"). The white-body
 * figures in that column (2.01, 1.02) are the fleet-state control's, and
 * they are UNCHANGED: that markup is App.jsx's former FleetStatePicker moved
 * verbatim, and it has measured this on the sign-in screen since 2026-11-04.
 *
 * ── NO STATUS-BAR BLEED, DELIBERATELY ─────────────────────────────────────
 * The hero is an INSET card, not a full-bleed band, so no artwork reaches the
 * top of the frame and `useStatusBarBleed` is not called. That is the
 * decision, not an omission: DesktopFrame draws a 44px status band with its
 * own ink above this screen and MobileLayout draws none
 * (Phone.jsx:19-21), and a card that starts below the band looks identical
 * under both. Bleeding would have put white-on-artwork glyphs next to the
 * band's own and bought a contrast problem for nothing.
 *
 * ── COPY IS UNCHANGED ─────────────────────────────────────────────────────
 * `login.choose_profile`, `login.choose_profile_sub`,
 * `login.switch_profile_hint` and `login.footer` are the same four keys this
 * screen has always rendered, in en.json and he.json. It deliberately does
 * NOT reuse `login.sign_in_as`: that string is routeSmoke's GATE_MARKER
 * (routeSmoke.dom.test.jsx:74) and if it appeared here the smoke case for
 * this very route would read it as "the login gate is showing" and fail.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { PersonaPickerList } from '../components/PersonaPicker';
import FleetStateChoice from '../components/FleetStateChoice';
import HeroCardShell from '@/v2/components/HeroCardShell';
import { useUserContext } from '../context/UserContext';

export default function PersonaSelect() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setPersona } = useUserContext();

  function selectPersona(persona) {
    setPersona(persona);
    navigate(persona.homePath);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col font-sans">
      {/* ONE scroll container, per the app-shell contract: the root is
          flex-1/min-h-0/flex-col and this is the only flex-1/overflow-y-auto
          child. There is no fixed chrome on this screen and no TabBar — it
          renders inside LoginGate, ahead of the tab shell — so everything
          scrolls together. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6">

        <HeroCardShell
          tone="brand"
          body={
            /* The white half of the hero. HeroCardShell gives neither section
               any padding, by its own contract — children and body bring
               their own — so the inset is here. */
            <div className="px-[18px] py-[14px]">
              <FleetStateChoice variant="bare" />
            </div>
          }
        >
          {/* The coloured half. Nothing here may be `absolute`: the section's
              height IS its content's height, which is what lets the white
              body butt straight onto it (HeroCardShell's own note). */}
          <div className="px-[18px] pt-[20px] pb-[22px]">
            {/* The white cut, unconditional. This mark has sat on a coloured
                ground on this screen since it existed, and the ground is the
                brand raster in every theme, so the [data-theme] swap
                LoginWintLogo does for a mark on the PAGE ground would be the
                wrong rule here — it keys on the app background, which is not
                what is behind this. Measured in chromium against the artwork
                under `light` and `contrast`, both shell paths. */}
            <img
              src={`${import.meta.env.BASE_URL}wint-logo-white.svg`}
              alt="WINT"
              className="mb-[14px] h-auto w-[86px]"
            />
            {/* --ink-on-color is the token for ink ON artwork — the same one
                SystemsOverviewHero's eyebrow, headline and chips use over the
                same raster. `text-primary-foreground` was the old band's
                token and belongs to a solid --primary fill, which is no
                longer what is underneath. */}
            <div className="font-bold tracking-[-0.3px] text-ink-on-color text-[16px] leading-[22px]">
              {t('login.choose_profile')}
            </div>
            {/* FULL OPACITY, not the /70 the old solid band used. No hero in
                this app fades its ink on artwork - SystemsOverviewHero's
                eyebrow, headline and chips are all flat --ink-on-color - and
                an alpha costs contrast that this ground has none to spare.
                Measured: /75 put this run at 2.57:1 (light) / 2.39 (dark);
                flat it is 3.41 / 3.12, in line with the location hero's own
                "12 Locations" at 3.35 / 3.04. See the measurement block in
                this file's header. */}
            <div className="mt-1 text-ink-on-color text-[14px] leading-[19px]">
              {t('login.choose_profile_sub')}
            </div>
          </div>
        </HeroCardShell>

        {/* The roles. Unchanged — <PersonaPickerList> is the shared card and
            already the house idiom. */}
        <div className="mt-3">
          <PersonaPickerList onSelect={selectPersona} />
        </div>

        {/* The More hint, on the profile cards' own chassis. Not a <button>:
            it has never been one and promoting it would invent an affordance
            that goes nowhere. `dangerouslySetInnerHTML` carries the <span
            style="font-weight:700"> around "More" that the locale string owns
            in both en and he; it is the same call this screen has always
            made, on a translated literal from our own bundle. */}
        <div className="mt-3 flex items-start gap-3 rounded-[18px] border border-solid border-card bg-surface-card px-4 py-[14px]">
          <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <Info className="size-[20px]" aria-hidden="true" />
          </span>
          <div
            className="min-w-0 flex-1 self-center text-slate-900 text-[13px] leading-[1.45]"
            dangerouslySetInnerHTML={{ __html: t('login.switch_profile_hint') }}
          />
        </div>

        <div className="mt-5 text-center text-slate-400 text-[12px] leading-[1.5]">
          {t('login.footer')}
        </div>
      </div>
    </div>
  );
}
