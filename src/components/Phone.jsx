import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 500 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function MobileLayout({ children, bgSolid }) {
  return (
    <>
      <style>{`
        .mobile-shell {
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          height: -webkit-fill-available;
          max-height: 100vh;
          max-height: 100dvh;
          max-height: -webkit-fill-available;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: ${bgSolid};
          position: fixed;
          top: 0;
          left: 0;
        }
      `}</style>
      <div className="mobile-shell">
        {children}
      </div>
    </>
  );
}

/**
 * The status-bar ink, read straight from the token layer.
 *
 * It used to come from the v1 theme object (src/context/ThemeContext.jsx:171),
 * which is frozen at rgb(15,23,43) under all four v2 themes -- that file is the
 * V1 theme engine and knows nothing about data-theme. On `dark` the band behind
 * these glyphs resolves to --app-bg over the near-black card, so "9:41", the
 * signal bars, the wifi arc and "100%" measured 1.06:1 against it. They were not
 * on the screen in any meaningful sense.
 *
 * ThemeContext is deliberately NOT extended: it is 449 lines of v1 machinery
 * carrying seven themes v2 does not use, and the tokenization plan is explicit
 * that v2 must not take a dependency on it. Phone.jsx is the one v2 route into
 * it, and reading the CSS variable directly is the smallest change that removes
 * the dependency for this value rather than deepening it.
 *
 * NO FALLBACK, ON PURPOSE. src/index.css's own header explains why: a
 * `var(--x, #hex)` fallback is a second, invisible source of truth that wins
 * silently whenever the token is missing. This file fails loudly instead. The
 * token owner declares --status-bar-ink; in `light` it has to resolve to
 * #0f172b, which is --slate-900 (the ramp step this literal always was), or the
 * frame stops being pixel-identical there.
 */
const STATUS_INK = 'var(--status-bar-ink)'

/**
 * RULING ON THE DESKTOP SURROUND (#DDE1E8) AND THE BEZEL (#0D0D0D).
 *
 * Both stay frozen, and that is a decision rather than an omission.
 *
 * Neither is app surface. This component simulates a physical handset sitting
 * on a desk: the bezel is the device's own plastic and the surround is the page
 * the reviewer is looking at the device ON. The in-app theme is a property of
 * what is INSIDE the screen, so propagating it outward would be a category
 * error -- switching the app to dark does not repaint your desk, and a review
 * page that inverts around the artefact makes two variables move at once in
 * exactly the comparison the page exists to support.
 *
 * The brief is right that #0D0D0D is benign on dark and arbitrary on sand and
 * contrast. It is arbitrary in the sense that any bezel colour would be; it is
 * not arbitrary in the sense of being an unthemed app token, because there is
 * no app token for "the colour of a phone". Same for the surround.
 *
 * What WOULD be defensible later, and is deliberately not done here because it
 * is out of this change's scope and cannot be verified from a headless browser
 * that reports light: keying the surround to `prefers-color-scheme`, i.e. to
 * the REVIEWER's environment rather than to the app's theme. That is the right
 * axis for review chrome. The in-app theme is not.
 *
 * Note this block is desktop-only. On a real phone MobileLayout runs instead
 * and there is no surround and no bezel to colour.
 */
function DesktopFrame({ children, theme }) {
  return (
    <div className="flex items-start justify-center min-h-screen p-6" style={{ background: '#DDE1E8' }}>
      <div style={{
        width: 393, height: 852,
        background: theme.phoneBg,
        borderRadius: 46,
        border: '9px solid #0D0D0D',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        flexShrink: 0,
        zoom: 1.08,
      }}>
        <div style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0,
          background: theme.statusBarBg,
          color: STATUS_INK,
        }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect x="0" y="4" width="3" height="8" rx="1" fill={STATUS_INK}/>
              <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill={STATUS_INK}/>
              <rect x="9" y="0.5" width="3" height="11.5" rx="1" fill={STATUS_INK}/>
              <rect x="13.5" y="0" width="2" height="12" rx="1" fill={STATUS_INK} opacity="0.3"/>
            </svg>
            <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
              <path d="M7.5 2C9.8 2 11.8 3 13.2 4.7L14.5 3.2C12.7 1.2 10.2 0 7.5 0S2.3 1.2.5 3.2L1.8 4.7C3.2 3 5.2 2 7.5 2Z" fill={STATUS_INK}/>
              <path d="M7.5 5C9 5 10.3 5.6 11.3 6.6L12.6 5.1C11.2 3.8 9.4 3 7.5 3S3.8 3.8 2.4 5.1L3.7 6.6C4.7 5.6 6 5 7.5 5Z" fill={STATUS_INK}/>
              <circle cx="7.5" cy="10" r="2" fill={STATUS_INK}/>
            </svg>
            <span>100%</span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Phone({ children }) {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  return isMobile
    ? <MobileLayout bgSolid={theme.bgSolid}>{children}</MobileLayout>
    : <DesktopFrame theme={theme}>{children}</DesktopFrame>;
}
