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
 * It was a near-duplicate of the sign-in picker in App.jsx with its own copy,
 * its own card markup and its own hardcoded palette. Rebuilt 2026-10-26
 * alongside the sign-in screen:
 *   • the card is now the shared <PersonaPickerList> (src/components/
 *     PersonaPicker.jsx), so the two pickers cannot drift again;
 *   • the same three roles, no human names, from LISTED_PERSONAS;
 *   • tokens only — the old `#F7F7F8` ground, the `#1E3A5F → #04ADEF` hero
 *     and the `#F5F3FF`/`#7C3AED` Wint chip were frozen under every theme;
 *   • the copy is translated. It was hardcoded English on a screen that
 *     ships Hebrew with RTL, which was a real gap: `login.choose_profile`
 *     and `login.choose_profile_sub` are new keys in en.json AND he.json.
 *
 * It deliberately does NOT reuse `login.sign_in_as`. That string is
 * routeSmoke's GATE_MARKER (routeSmoke.dom.test.jsx:74) — if it appeared on
 * /select, the smoke case for this very route would read it as "the login
 * gate is showing" and fail.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PersonaPickerList } from '../components/PersonaPicker';
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

      {/* Header band. `bg-primary` rather than the old navy→cyan literal, so
          it follows the theme; the white wordmark is the shipped cut and is
          legible on --primary in all four. */}
      <div className="shrink-0 bg-primary px-6 pt-9 pb-7 text-primary-foreground">
        <img
          src={`${import.meta.env.BASE_URL}wint-logo-white.svg`}
          alt="WINT"
          className="mb-[14px] h-auto w-[86px]"
        />
        <div className="font-bold tracking-[-0.3px] text-[16px] leading-[22px]">
          {t('login.choose_profile')}
        </div>
        <div className="mt-1 text-primary-foreground/70 text-[14px] leading-[19px]">
          {t('login.choose_profile_sub')}
        </div>
      </div>

      {/* Profiles */}
      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pt-4 pb-6">

        {/* Switch-profile hint — carried over from the previous version; it is
            what tells a reviewer this screen exists at all. */}
        <div className="mb-4 flex items-start gap-[10px] rounded-[12px] border border-solid border-primary/25 bg-secondary px-3 py-[10px]">
          <span
            className="mt-px size-[18px] shrink-0 rounded-full bg-primary text-center font-bold text-primary-foreground text-[13px] leading-[18px]"
            aria-hidden="true"
          >i</span>
          <div
            className="min-w-0 flex-1 text-slate-900 text-[13px] leading-[1.45]"
            dangerouslySetInnerHTML={{ __html: t('login.switch_profile_hint') }}
          />
        </div>

        <PersonaPickerList onSelect={selectPersona} />

        <div className="mt-6 text-center text-slate-400 text-[13px] leading-[1.5]">
          {t('login.footer')}
        </div>
      </div>
    </div>
  );
}
