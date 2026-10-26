import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Info, Link2, QrCode, X } from 'lucide-react';
import Phone from './components/Phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonaPickerList } from './components/PersonaPicker';
import { UserProvider, useUserContext } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';

import PersonaSelect from './screens/PersonaSelect';
import ControlPanel from './screens/ControlPanel';
import PushNotifications from './components/PushNotifications';
import SplashScreen from './components/SplashScreen';
import HomeManager from './screens/home/HomeManager';
import HomeUnified from './screens/home/HomeUnified';
import HomeClear from './screens/home/HomeClear';
import HomeMultiAccount from './screens/home/HomeMultiAccount';
import EventsScreen from './screens/events/EventsScreen';
import L4Screen from './screens/systems/L4Screen';
import SystemDetail from './screens/systems/SystemDetail';
import SystemPageV2 from './v2/pages/SystemPage';
// Pixel-matched rebuilds, reachable at /pixel/* for review. Not yet wired to
// the default routes — see the preview block in the route table below.
import HomeAllAccounts from './v2/pages/HomeAllAccounts';
import SystemPageV2Screen from './v2/pages/SystemPageV2Screen';
import HomeAccountOverview from './v2/pages/HomeAccountOverview';
import LeakDetail from './screens/leak/LeakDetail';
import EventHistory from './screens/EventHistory';
import AccountScreenV2 from './v2/pages/AccountScreenV2';
import KPIDetailScreen from './screens/kpi/KPIDetailScreen';
import TenantPropertiesList from './screens/home/TenantPropertiesList';


/* Tenant home routing:
 *   • 1 apartment   → redirect straight to the apartment's detail page
 *                     (TenantOverview renders inside SystemDetail).
 *   • 2+ apartments → properties list (TenantPropertiesList).
 * No more HomeManager for tenants — it was the manager view leaking in.
 */
function TenantHome() {
  const { visibleSystems = [], persona } = useUserContext() || {};
  // Defensive: if a non-tenant ends up at /tenant (e.g. from a stale URL after
  // switching personas), redirect to the manager Home. /tenant is exclusively
  // for tabMode='tenant' personas.
  if (persona && persona.tabMode !== 'tenant') {
    return <Navigate to="/" replace />;
  }
  if (visibleSystems.length === 1) {
    return <Navigate to={`/system/${visibleSystems[0].id}`} replace />;
  }
  return <TenantPropertiesList />;
}

/* Systems screen — redirects to unified Home (Systems tab is gone) */
function SystemsRouter() {
  return <HomeUnified />;
}

function AppRoutes() {
  return (
      <Routes>
        {/* Entry — persona selector */}
        <Route path="/select" element={<PersonaSelect />} />

        {/* Home variants */}
        {/* PREVIEW TREE ONLY — these two lines are the swap. On main they
            still point at HomeAccountOverview / SystemPageV2. The originals
            stay reachable at /old and /old/system/:systemId for comparison. */}
        <Route path="/" element={<HomeAllAccounts />} />
        <Route path="/old" element={<HomeAccountOverview />} />
        <Route path="/v1/" element={<HomeUnified />} />{/* v1 kept for reference */}

        {/* ── Pixel-match preview ──────────────────────────────────────────
            Rebuilt verbatim from the Figma delivery canvas. Additive on
            purpose: / and /system/:systemId still render the existing pages,
            so nothing that works today changes. Repointing those is the
            functionality change Rule 0 covers and needs the owner's sign-off.
            Delete this block once the swap happens. */}
        <Route path="/pixel" element={<HomeAllAccounts />} />
        <Route path="/pixel/expanded" element={<HomeAllAccounts expanded />} />
        <Route path="/pixel/location/:locationName" element={<HomeAllAccounts />} />
        <Route path="/pixel/system/:systemId" element={<SystemPageV2Screen />} />
        {/* Figma "Location opt b" (198328:88654) — same screen, scoped title. */}
        <Route path="/location/:locationName" element={<HomeAllAccounts />} />
        <Route path="/home-clear" element={<HomeClear />} />
        <Route path="/tenant" element={<TenantHome />} />
        <Route path="/home-multi" element={<HomeMultiAccount />} />
        <Route path="/home-legacy" element={<HomeManager />} />

        {/* Alerts */}
        <Route path="/alerts" element={<EventsScreen />} />
        <Route path="/alerts/system/:systemId" element={<EventHistory />} />
        <Route path="/events" element={<EventsScreen />} />
        <Route path="/events/system/:systemId" element={<EventHistory />} />

        {/* Systems hierarchy — view mode from settings */}
        <Route path="/systems" element={<SystemsRouter />} />
        <Route path="/l4/:l4id" element={<L4Screen />} />
        <Route path="/system/:systemId" element={<SystemPageV2Screen />} />
        <Route path="/old/system/:systemId" element={<SystemPageV2 />} />
        <Route path="/v1/system/:systemId" element={<SystemDetail />} />{/* v1 kept for reference */}

        {/* KPI detail */}
        <Route path="/kpi/:type" element={<KPIDetailScreen />} />

        {/* Alert detail (formerly /leak/:id — kept as legacy alias) */}
        <Route path="/alert/:systemId" element={<LeakDetail />} />
        <Route path="/leak/:systemId" element={<LeakDetail />} />

        {/* Account */}
        {/* More / Account. Repointed to the v2 port 2026-10-17. The v1 screen
            stayed on disk unused until 2026-10-24, when it was deleted with
            the rest of the dead tree; AccountScreenV2 folds the profile in as
            a sub-view, so there is no second user-profile page any more. */}
        <Route path="/account" element={<AccountScreenV2 />} />

        {/* Default — go to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function WintLogo({ white = false, width = 120 }) {
  const src = white
    ? `${import.meta.env.BASE_URL}wint-logo-white.svg`
    : `${import.meta.env.BASE_URL}wint-logo.svg`;
  return <img src={src} alt="WINT" style={{ width, height: 'auto' }} />;
}

// Shared demo password. Cleared to sessionStorage after a correct entry so the
// user isn't re-challenged on every navigation within the session.
const DEMO_PASSWORD = 'WINT2026';
const PASSWORD_SESSION_KEY = 'pulse2-demo-pw-ok';

function PasswordGate({ children }) {
  const { t } = useTranslation();
  const [ok, setOk] = useState(() => sessionStorage.getItem(PASSWORD_SESSION_KEY) === '1');
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  function submit() {
    if (entered === DEMO_PASSWORD) {
      sessionStorage.setItem(PASSWORD_SESSION_KEY, '1');
      setOk(true);
    } else {
      setError(true);
    }
  }

  if (ok) return children;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      background: '#fff',
      fontFamily: 'Inter, -apple-system, sans-serif',
      maxWidth: 500, width: '100%', margin: '0 auto',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      <div style={{ marginBottom: 16 }}>
        <WintLogo width={110} />
      </div>
      <div style={{ height: 3, width: 90, background: 'linear-gradient(90deg, #0B95F8, #4CC9F0)', borderRadius: 2, marginBottom: 28 }} />

      <div style={{ fontSize: 18, fontWeight: 700, color: '#14151A', letterSpacing: '-0.3px', marginBottom: 6 }}>
        {t('password_gate.title')}
      </div>
      <div style={{ fontSize: 13, color: '#717684', marginBottom: 22, textAlign: 'center', lineHeight: 1.45 }}>
        {t('password_gate.subline')}
      </div>

      <input
        type="password"
        autoFocus
        value={entered}
        onChange={(e) => { setEntered(e.target.value); setError(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder={t('password_gate.placeholder')}
        style={{
          width: '100%', maxWidth: 320,
          padding: '13px 16px', fontSize: 16, fontFamily: 'inherit',
          border: `1.5px solid ${error ? '#DB4670' : '#DEE0E3'}`,
          borderRadius: 10, outline: 'none',
          color: '#14151A', background: '#fff',
          textAlign: 'center', letterSpacing: 2,
          boxSizing: 'border-box',
        }}
      />
      {error && (
        <div style={{ marginTop: 10, fontSize: 13, color: '#DB4670', fontWeight: 500 }}>
          {t('password_gate.error')}
        </div>
      )}

      <button
        onClick={submit}
        disabled={!entered}
        style={{
          marginTop: 18, width: '100%', maxWidth: 320,
          padding: 13, borderRadius: 10,
          background: entered ? '#0B95F8' : '#E8EAED',
          color: entered ? '#fff' : '#9DA3AE',
          border: 'none',
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          cursor: entered ? 'pointer' : 'not-allowed',
        }}
      >{t('password_gate.submit')}</button>
    </div>
  );
}

function LoginGate({ children }) {
  const { t } = useTranslation();
  const loginNavigate = useNavigate();
  const { setPersona } = useUserContext();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('pulse2-auth') === 'true');

  // Push-simulator pairing state. If the user arrived via the pusher QR
  // (URL `?p=<code>`), we silently store the code in sessionStorage and show
  // a green chip at the top of the login screen. Pairing is opt-in - opening
  // the app without `?p=` shows the normal login screen with a discreet
  // "Connect to push simulator" link for PWA-icon users.
  const [pairCode, setPairCode] = useState(() => sessionStorage.getItem('pulse2-pair-code') || null);
  const [showConnectSheet, setShowConnectSheet] = useState(false);

  // Read `?p=` from URL on mount. Persist + clean the URL so refreshes still
  // pair without keeping the query string in view.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('p');
      if (p && p.trim()) {
        sessionStorage.setItem('pulse2-pair-code', p.trim());
        setPairCode(p.trim());
        // Clean the URL — keep the rest of the path but drop `?p=`.
        params.delete('p');
        const cleaned = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash;
        window.history.replaceState({}, '', cleaned);
      }
    } catch { /* ignore */ }
  }, []);

  const dismissPair = () => {
    sessionStorage.removeItem('pulse2-pair-code');
    setPairCode(null);
  };

  const submitPairCode = (code) => {
    if (!code || !code.trim()) return;
    sessionStorage.setItem('pulse2-pair-code', code.trim());
    setPairCode(code.trim());
    setShowConnectSheet(false);
  };

  // Persona picker → log in as that persona. Replaces the email/password
  // ceremony for the demo. The login screen IS the persona picker now;
  // tapping a card sets the persona, marks auth, and navigates to that
  // persona's homePath. Email/password form removed 2026-06-04.
  // Animated splash fires on every successful login (option C): we clear the
  // splash-shown flag and dispatch an event the SplashController listens for.
  const handlePickPersona = (p) => {
    setPersona(p);
    sessionStorage.setItem('pulse2-auth', 'true');
    // Re-arm the splash for this login transition.
    sessionStorage.removeItem('wint-splash-shown');
    window.dispatchEvent(new CustomEvent('wint-trigger-splash'));
    setAuthed(true);
    const deepLink = sessionStorage.getItem('pulse2-deep-link');
    if (deepLink) {
      sessionStorage.removeItem('pulse2-deep-link');
      setTimeout(() => loginNavigate(deepLink), 100);
    } else {
      setTimeout(() => loginNavigate(p.homePath || '/'), 50);
    }
  };

  // Capture where they were heading BEFORE the picker takes the screen.
  // handlePickPersona has always restored `pulse2-deep-link`, but nothing in
  // the app ever wrote it — so the restore branch was dead code and anyone
  // opening a shared /system/:id link cold landed on Home instead. Written
  // only while unauthed, and only for a real destination, so a normal cold
  // start on "/" still goes to the persona's own home.
  useEffect(() => {
    if (authed) return;
    const here = window.location.pathname.replace(import.meta.env.BASE_URL, '/') + window.location.search;
    if (here && here !== '/' && !here.startsWith('/select')) {
      try { sessionStorage.setItem('pulse2-deep-link', here); } catch { /* private mode */ }
    }
  }, [authed]);

  if (authed) return children;

  /* The sign-in screen — the persona picker.
   *
   * REBUILT 2026-10-26 onto the v2 token layer. Two things were wrong with
   * the version this replaces, beyond its age:
   *
   *  1. It painted itself `background:'#fff'` and drew its chips from frozen
   *     `#F5F3FF` / `#7C3AED`, so it was the one screen in the app that could
   *     not follow a theme — and it is the FIRST screen a reviewer sees.
   *     There is no background declared here now: Phone.jsx paints --app-bg
   *     behind it, and index.html stamps data-theme on <html> before first
   *     paint, so the tokens below resolve even though this renders ahead of
   *     the app gate. `?theme=contrast` is the check — nothing on this screen
   *     may sit still under it.
   *  2. It split PERSONAS on `isWint` into "Customer users" / "WINT STAFF"
   *     sections. The owner's ask (2026-10-26) is three roles and no human
   *     names, so there is one flat list and the section headers are gone.
   *     `login.customer_users` / `login.wint_staff` are left in en.json and
   *     he.json rather than deleted — they cost nothing, the two files stay
   *     line-aligned, and the split is a decision that could come back.
   *
   * The sheet below is deliberately NOT a Radix <Sheet>: Radix portals to
   * document.body and escapes Phone.jsx's 393x852 overflow-hidden frame —
   * the failure src/v2/components/ValveConfirmSheet.jsx:17-25 documents.
   * This one is position:absolute inside the frame and stays put.
   */
  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[500px] flex-1 flex-col font-sans">
      {/* Push-simulator paired chip — shown at top when ?p= was in the URL or
          the user entered a code via the Connect sheet. */}
      {pairCode && (
        <div className="flex items-center gap-2 bg-success px-3 py-2 text-success-foreground">
          <Link2 className="size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 font-semibold text-[12px] leading-[1.3]">
            {t('login.paired_with_pusher')}
            <div className="mt-px font-medium text-[10px] opacity-85">
              {t('login.code_label')}{' '}
              <code className="rounded-[3px] bg-success-foreground/20 px-1">{pairCode}</code>
              {' · '}
              {t('login.paired_desc')}
            </div>
          </div>
          <button
            type="button"
            onClick={dismissPair}
            aria-label={t('common.cancel')}
            className="shrink-0 cursor-pointer p-1 opacity-80 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* WINT wordmark + brand rule */}
      <div className="flex justify-center pt-6">
        <LoginWintLogo />
      </div>
      <div className="mx-7 mt-[14px] h-[3px] rounded-[2px] bg-gradient-to-r from-primary to-primary/40" />

      {/* Picker header. 'Sign in as' is load-bearing beyond the design:
          routeSmoke.dom.test.jsx:74 uses it as a GATE_MARKER to prove the test
          seeding still works, so the copy stays exactly as it is. */}
      <div className="px-6 pt-5 pb-1">
        <div className="font-bold tracking-[-0.3px] text-slate-900 text-[18px] leading-[24px]">
          {t('login.sign_in_as')}
        </div>
        <div className="mt-[2px] text-slate-500 text-[13px] leading-[18px]">
          {t('login.demo_subline')}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pt-3 pb-6">

        {/* Connect to push simulator — discreet link above the profiles, for
            the case where the app was opened from a PWA icon without the ?p=
            URL param. Hidden once paired. */}
        {!pairCode && (
          <button
            type="button"
            onClick={() => setShowConnectSheet(true)}
            className="mt-[6px] mb-3 flex w-full cursor-pointer items-center gap-[10px] rounded-[12px] border border-dashed border-border-strong bg-muted/60 px-3 py-[10px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <QrCode className="size-[18px] shrink-0 text-slate-500" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-slate-900 text-[12.5px] leading-[17px]">
                {t('login.connect_pusher')}
              </span>
              <span className="mt-px block truncate text-slate-500 text-[11px] leading-[15px]">
                {t('login.connect_pusher_desc')}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
          </button>
        )}

        {/* Switch-profile hint — reminds reviewers they can swap profiles at
            any time from the More tab. */}
        <div className="mt-[6px] mb-[14px] flex items-start gap-[10px] rounded-[12px] border border-solid border-primary/25 bg-secondary px-3 py-[10px]">
          <Info className="mt-px size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <div
            className="min-w-0 flex-1 text-slate-900 text-[13px] leading-[1.45]"
            dangerouslySetInnerHTML={{ __html: t('login.switch_profile_hint') }}
          />
        </div>

        <PersonaPickerList onSelect={handlePickPersona} />

        <div className="mt-5 text-center text-slate-400 text-[12px] leading-[1.5]">
          {t('login.footer')}
        </div>
      </div>

      {/* Connect-to-pusher bottom sheet — manual pair fallback when the user
          didn't arrive via ?p=. Backdrop tap or Cancel closes. */}
      {showConnectSheet && (
        <PairConnectSheet
          onSubmit={submitPairCode}
          onCancel={() => setShowConnectSheet(false)}
        />
      )}
    </div>
  );
}

/**
 * The wordmark on the sign-in screen, themed.
 *
 * public/wint-logo.svg is a navy #20294C mark; on `dark` and on `contrast` it
 * measures ~1.3:1 against the ground behind it. public/wint-logo-white.svg is
 * the shipped white cut. The swap is CSS on [data-theme] rather than on
 * state, so it happens at paint time and needs no re-render — the same
 * mechanism WintSidebarV2.jsx uses, restated here because this screen renders
 * long before the sidebar exists. `sand` is a light theme and keeps the navy
 * mark.
 *
 * currentColor is not an option: an external SVG loaded through <img> has no
 * CSS context into the file. The plain WintLogo above is deliberately left
 * alone — PasswordGate still paints a literal white panel, so a white mark
 * there would vanish.
 */
function LoginWintLogo() {
  return (
    <>
      <img
        src={`${import.meta.env.BASE_URL}wint-logo.svg`}
        alt="WINT"
        className="h-auto w-[110px] [[data-theme=contrast]_&]:hidden [[data-theme=dark]_&]:hidden"
      />
      <img
        src={`${import.meta.env.BASE_URL}wint-logo-white.svg`}
        alt="WINT"
        className="hidden h-auto w-[110px] [[data-theme=contrast]_&]:block [[data-theme=dark]_&]:block"
      />
    </>
  );
}

/* Bottom sheet — Connect to push simulator. Backdrop + sheet at the bottom.
   Submit accepts the 5-6 char code shown beside the laptop's QR.

   NOT a Radix <Sheet>, on purpose — see the note on the screen above: a Radix
   portal escapes Phone.jsx's 393x852 overflow-hidden frame. This is a plain
   absolutely-positioned layer inside it. */
function PairConnectSheet({ onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  return (
    <div
      onClick={onCancel}
      className="absolute inset-0 z-[100] flex flex-col justify-end bg-scrim backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-t-[22px] bg-card pt-3 pb-6 shadow-[0_-6px_24px_rgba(0,0,0,0.16)]"
      >
        <div className="mx-auto mb-[14px] h-1 w-9 rounded-[2px] bg-border-subtle" />
        <div className="px-5">
          <div className="font-bold text-slate-900 text-[16px] leading-[22px]">
            {t('login.connect_pusher')}
          </div>
          <div className="mt-1 text-slate-500 text-[12.5px] leading-[1.45]">
            {t('login.connect_pusher_long_desc')}
          </div>
        </div>
        <div className="mx-5 mt-4">
          <div className="mb-[6px] font-semibold text-slate-500 text-[11px] leading-[15px]">
            {t('login.enter_code')}
          </div>
          <Input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(code); }}
            placeholder="7K-3Q9"
            maxLength={8}
            className="h-auto rounded-[10px] border-[1.5px] border-border-strong px-[14px] py-3 text-center font-mono-label font-bold text-slate-900 text-[18px] tracking-[4px] md:text-[18px]"
          />
        </div>
        <div className="mx-5 mt-4 flex gap-[10px]">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-auto flex-1 cursor-pointer rounded-[10px] py-3 font-semibold text-[14px]"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => onSubmit(code)}
            disabled={!code.trim()}
            className="h-auto flex-1 cursor-pointer rounded-[10px] py-3 font-bold text-[14px]"
          >
            {t('login.connect')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* The persona card that used to live here is now
   src/components/PersonaPicker.jsx, shared with screens/PersonaSelect.jsx so
   the two pickers cannot drift apart again. */

function AppShell() {
  const location = useLocation();

  // Push Simulator — standalone desktop tool, no LoginGate.
  // /push is the canonical route. /control and /push-panel are kept as
  // back-compat aliases so old bookmarks still work.
  const isPusher =
    location.pathname.endsWith('/push') ||
    location.pathname.endsWith('/control') ||
    location.pathname.endsWith('/push-panel');
  if (isPusher) {
    return (
      <UserProvider>
        <ControlPanel title="Push Simulator" />
      </UserProvider>
    );
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <Phone>
          <PasswordGate>
            <PushNotifications>
              <LoginGate>
                <AppRoutes />
              </LoginGate>
            </PushNotifications>
          </PasswordGate>
          <SplashController />
        </Phone>
      </UserProvider>
    </ThemeProvider>
  );
}

function SplashController() {
  // Splash plays ONLY after profile selection (option C locked 2026-07-13):
  // cold app load shows the password gate + persona picker directly, no
  // splash. LoginGate fires `wint-trigger-splash` after successful pick.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('wint-trigger-splash', handler);
    return () => window.removeEventListener('wint-trigger-splash', handler);
  }, []);
  if (!show) return null;
  return <SplashScreen variant="light" onComplete={() => setShow(false)} />;
}

/* basename is REQUIRED, not optional tidiness. Vite serves this app under base
   '/pulse2_mobile_product_mockup_v2/' in dev and on GH Pages alike, so without
   it a hard load of /pulse2_mobile_product_mockup_v2/system/:id hands the
   router a path no route matches and the catch-all bounces the viewer to Home.
   Clicking through HIDES the bug — an in-app navigate pushes a base-less path
   that happens to match — so it only shows up when someone pastes or reloads a
   URL, which is exactly how these links get shared for review. postbuild's
   404.html copy is what lets GH Pages serve the deep link at all; this is what
   lets the router read it once served. */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  );
}
