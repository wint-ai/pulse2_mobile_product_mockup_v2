import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Phone from './components/Phone';
import SwipeableView from './components/SwipeableView';
import { UserProvider, useUserContext } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { PERSONAS } from './data/personas';

import PersonaSelect from './screens/PersonaSelect';
import ControlPanel from './screens/ControlPanel';
import PushNotifications from './components/PushNotifications';
import SplashScreen from './components/SplashScreen';
import HomeManager from './screens/home/HomeManager';
import HomeUnified from './screens/home/HomeUnified';
import HomeClear from './screens/home/HomeClear';
import HomeMultiAccount from './screens/home/HomeMultiAccount';
import EventsScreen from './screens/events/EventsScreen';
import SystemsTab from './screens/systems/SystemsTab';
import SystemsTab2 from './screens/systems/SystemsTab2';
import SystemsTab3 from './screens/systems/SystemsTab3';
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
import AccountScreen from './screens/AccountScreen';
import KPIDetailScreen from './screens/kpi/KPIDetailScreen';
import TenantPropertiesList from './screens/home/TenantPropertiesList';

const TAB_ORDER = ['/', '/systems', '/alerts', '/account'];

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
        <Route path="/" element={<HomeAccountOverview />} />
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
        <Route path="/location/:locationName" element={<HomeAccountOverview />} />
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
        <Route path="/system/:systemId" element={<SystemPageV2 />} />
        <Route path="/v1/system/:systemId" element={<SystemDetail />} />{/* v1 kept for reference */}

        {/* KPI detail */}
        <Route path="/kpi/:type" element={<KPIDetailScreen />} />

        {/* Alert detail (formerly /leak/:id — kept as legacy alias) */}
        <Route path="/alert/:systemId" element={<LeakDetail />} />
        <Route path="/leak/:systemId" element={<LeakDetail />} />

        {/* Account */}
        <Route path="/account" element={<AccountScreen />} />

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

  if (authed) return children;

  // Login screen — persona picker
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      background: '#fff',
      fontFamily: 'Inter, -apple-system, sans-serif',
      maxWidth: 500, width: '100%', margin: '0 auto',
      position: 'relative',
    }}>
      {/* Push-simulator paired chip - shown at top when ?p= was in URL or
          user manually entered a code via the Connect sheet. */}
      {pairCode && (
        <div style={{
          background: 'linear-gradient(90deg, #5C9E1A 0%, #2F6112 100%)',
          color: '#fff',
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>link</span>
          <div style={{ flex: 1, lineHeight: 1.3 }}>
            {t('login.paired_with_pusher')}
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 1, fontWeight: 500 }}>
              {t('login.code_label')} <code style={{ background: 'rgba(255,255,255,0.18)', padding: '0 4px', borderRadius: 3 }}>{pairCode}</code> · {t('login.paired_desc')}
            </div>
          </div>
          <span
            onClick={dismissPair}
            style={{ fontSize: 16, opacity: 0.8, cursor: 'pointer', padding: '0 4px' }}
          >✕</span>
        </div>
      )}

      {/* WINT logo + blue line */}
      <div style={{ textAlign: 'center', padding: '24px 0 0', display: 'flex', justifyContent: 'center' }}>
        <WintLogo width={110} />
      </div>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #0B95F8, #4CC9F0)', margin: '14px 28px 0', borderRadius: 2 }} />

      {/* Picker header */}
      <div style={{ padding: '20px 24px 4px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#14151A', letterSpacing: '-0.3px' }}>{t('login.sign_in_as')}</div>
        <div style={{ fontSize: 13, color: '#717684', marginTop: 2 }}>{t('login.demo_subline')}</div>
      </div>

      {/* Customer personas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 24px' }}>

        {/* Connect to push simulator — discreet link at TOP of the persona list
            for the case where the user opened the app from a PWA icon without
            the ?p= URL param. Hidden when already paired. */}
        {!pairCode && (
          <div
            onClick={() => setShowConnectSheet(true)}
            style={{
              padding: '10px 12px',
              border: '1px dashed #BCC3CE',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(245,246,248,0.5)',
              cursor: 'pointer',
              margin: '6px 0 12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#717684', fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#14151A' }}>{t('login.connect_pusher')}</div>
              <div style={{ fontSize: 11, color: '#717684', marginTop: 1 }}>{t('login.connect_pusher_desc')}</div>
            </div>
            <span style={{ fontSize: 16, color: '#D1D5DB' }}>›</span>
          </div>
        )}

        {/* Switch-profile hint — reminds reviewers that they can swap between
            these personas at any time by tapping the More tab at the bottom
            of the app. Sits above the customer-users section so it's the
            first thing the reader sees on the login screen. */}
        <div style={{
          background: 'rgba(4,173,239,0.08)',
          border: '1px solid rgba(4,173,239,0.25)',
          borderRadius: 12,
          padding: '10px 12px',
          margin: '6px 0 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: '#036AB5', marginTop: 1, fontVariationSettings: "'FILL' 1", flexShrink: 0 }}
          >info</span>
          <div
            style={{ fontSize: 13, color: '#14151A', lineHeight: 1.45 }}
            dangerouslySetInnerHTML={{ __html: t('login.switch_profile_hint') }}
          />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#9DA3AE', textTransform: 'uppercase', letterSpacing: '.5px', margin: '6px 4px 8px' }}>
          {t('login.customer_users')}
        </div>
        {PERSONAS.filter(p => !p.isWint).map(p => (
          <LoginPersonaCard key={p.id} persona={p} onSelect={handlePickPersona} />
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#9DA3AE', textTransform: 'uppercase', letterSpacing: '.5px', margin: '18px 4px 8px' }}>
          {t('login.wint_staff')}
        </div>
        {PERSONAS.filter(p => p.isWint).map(p => (
          <LoginPersonaCard key={p.id} persona={p} onSelect={handlePickPersona} />
        ))}

        <div style={{ fontSize: 12, color: '#9DA3AE', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          {t('login.footer')}
        </div>
      </div>

      {/* Connect-to-pusher bottom sheet — manual pair fallback when the user
          didn't arrive via ?p= URL. Backdrop tap or Cancel closes. */}
      {showConnectSheet && (
        <PairConnectSheet
          onSubmit={submitPairCode}
          onCancel={() => setShowConnectSheet(false)}
        />
      )}
    </div>
  );
}

// Bottom sheet — Connect to push simulator. Backdrop blur + sheet at bottom.
// Submit accepts a 5-6 char code typed by the user (matching the laptop QR).
function PairConnectSheet({ onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(20,21,26,0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 100,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '12px 0 24px',
          boxShadow: '0 -6px 24px rgba(0,0,0,0.16)',
        }}
      >
        <div style={{ width: 36, height: 4, background: '#DEE0E3', borderRadius: 2, margin: '0 auto 14px' }}></div>
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#14151A' }}>{t('login.connect_pusher')}</div>
          <div style={{ fontSize: 12.5, color: '#717684', marginTop: 4, lineHeight: 1.45 }}>
            {t('login.connect_pusher_long_desc')}
          </div>
        </div>
        <div style={{ margin: '16px 20px 0' }}>
          <div style={{ fontSize: 11, color: '#717684', fontWeight: 600, marginBottom: 6 }}>{t('login.enter_code')}</div>
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(code); }}
            placeholder="7K-3Q9"
            maxLength={8}
            style={{
              width: '100%', padding: '12px 14px',
              border: '1.5px solid #DEE0E3', borderRadius: 10,
              fontSize: 18, fontWeight: 700,
              letterSpacing: 4, textAlign: 'center',
              fontFamily: 'SF Mono, Menlo, monospace',
              color: '#14151A', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ margin: '16px 20px 0', display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: 'transparent', border: '1px solid #DEE0E3',
              fontSize: 14, fontWeight: 600, color: '#4A4F5A',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{t('common.cancel')}</button>
          <button
            onClick={() => onSubmit(code)}
            disabled={!code.trim()}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              background: code.trim() ? '#0B95F8' : '#E8EAED',
              color: code.trim() ? '#fff' : '#9DA3AE',
              border: 'none',
              fontSize: 14, fontWeight: 700,
              cursor: code.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >{t('login.connect')}</button>
        </div>
      </div>
    </div>
  );
}

// Persona card on the login screen — tap to log in as that persona.
function LoginPersonaCard({ persona: p, onSelect }) {
  return (
    <div
      onClick={() => onSelect(p)}
      style={{
        background: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        cursor: 'pointer',
        border: '1px solid #E5E8EE',
        borderLeft: `4px solid ${p.color}`,
        padding: '12px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        boxShadow: '0 1px 3px rgba(20,21,26,0.04)',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: p.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{p.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#14151A', letterSpacing: '-0.2px' }}>{p.name}</span>
          {p.isWint && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: '#F5F3FF', color: '#7C3AED', letterSpacing: '.3px', textTransform: 'uppercase',
            }}>Wint</span>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: p.color, marginBottom: 1 }}>{p.role}</div>
        <div style={{ fontSize: 12, color: '#717684' }}>{p.sub}</div>
      </div>
      <span style={{ fontSize: 16, color: '#D1D5DB', flexShrink: 0 }}>›</span>
    </div>
  );
}

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

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
