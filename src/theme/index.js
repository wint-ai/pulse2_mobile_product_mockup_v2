/**
 * Theme preference — the runtime half of the token sets in src/index.css.
 *
 * SHAPE: this is src/i18n/index.js, copied. That file is the one working
 * persisted preference in this codebase (a boot read, a registry with
 * metadata, an apply-on-change) and the theme row sits directly beside its
 * row in the UI, so it follows the same shape rather than inventing a second
 * one. It is deliberately NOT src/context/ThemeContext.jsx: that is the v1
 * engine, it is a React context full of colour VALUES, and it is why v1 has
 * ~1,840 inline styles. React here holds the theme NAME and nothing else.
 * All colour lives in CSS.
 *
 * The attribute is stamped on <html>, not on a wrapper div, so that Radix
 * portals (dialog / sheet / tooltip / sidebar render into document.body) are
 * themed too.
 */

/* NOT 'pulse2-theme': the v1 engine src/context/ThemeContext.jsx already owns
   that key and writes 'wint' into it (ThemeContext.jsx:427,431). Sharing it
   would make each engine read the other's value as garbage. Namespaced to v2. */
const THEME_STORAGE_KEY = 'pulse2-v2-theme'
const DEFAULT_THEME = 'light'

/**
 * `labelKey` is an i18n key, not a string: the row is translated.
 * `selectable: false` keeps `contrast` out of the picker — it is the
 * diagnostic theme and is reachable only via ?theme=contrast.
 * `themeColor` is that theme's own --background rendered as hex, for the
 * <meta name="theme-color"> browser chrome. It is not a design choice: it is
 * the same colour the CSS declares, in the one notation that tag is safe with.
 */
export const SUPPORTED_THEMES = [
  { key: 'light', labelKey: 'more.themes.light', selectable: true, themeColor: '#f4f6f9' },
  { key: 'dark', labelKey: 'more.themes.dark', selectable: true, themeColor: '#09090b' },
  { key: 'sand', labelKey: 'more.themes.sand', selectable: true, themeColor: '#ffffff' },
  { key: 'contrast', labelKey: null, selectable: false, themeColor: '#be00c0' },
]

export const SELECTABLE_THEMES = SUPPORTED_THEMES.filter((t) => t.selectable)

function isTheme(key) {
  return SUPPORTED_THEMES.some((t) => t.key === key)
}

/**
 * The same resolution order the blocking boot script in index.html runs:
 * ?theme= override first (it is the only way to reach `contrast`, and on the
 * deployed Pages site it is a shareable review link), then storage, then the
 * default. Kept in step with that script deliberately — see the comment there.
 */
export function detectInitialTheme() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('theme')
    if (fromUrl && isTheme(fromUrl)) return fromUrl
  } catch { /* no window/URL — SSR or test env */ }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved && isTheme(saved)) return saved
  } catch { /* localStorage unavailable */ }
  return DEFAULT_THEME
}

/** What is on <html> right now, falling back to a fresh detect. */
export function getTheme() {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.getAttribute('data-theme')
    if (current && isTheme(current)) return current
  }
  return detectInitialTheme()
}

/**
 * Stamp the theme. `.dark` is toggled alongside data-theme because the stock
 * shadcn components ship their own `dark:` utilities and the @custom-variant
 * at the top of src/index.css binds those to the class, not to the attribute.
 */
export function applyTheme(key) {
  const theme = SUPPORTED_THEMES.find((t) => t.key === key) || SUPPORTED_THEMES[0]
  if (typeof document === 'undefined') return theme.key
  const root = document.documentElement
  root.setAttribute('data-theme', theme.key)
  root.classList.toggle('dark', theme.key === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.themeColor)
  return theme.key
}

/** Persist and apply. Returns the key that was actually applied. */
export function setTheme(key) {
  const applied = applyTheme(key)
  try { localStorage.setItem(THEME_STORAGE_KEY, applied) } catch { /* ignore */ }
  return applied
}

export { THEME_STORAGE_KEY, DEFAULT_THEME }
