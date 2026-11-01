/**
 * App background preference — the runtime half of the `data-bg` block at the
 * foot of src/index.css.
 *
 * SHAPE: this is src/theme/index.js, copied, for the same reason that file is
 * src/i18n/index.js copied — the two rows sit next to each other in Personal
 * settings and a second shape for the same job is a second thing to maintain.
 * A boot read, a registry with metadata, an apply-on-change. React holds the
 * option NAME and nothing else; every colour lives in CSS.
 *
 * WHY A SECOND ATTRIBUTE AND NOT MORE THEMES. `data-bg` is ORTHOGONAL to
 * `data-theme`: nine grounds times four themes is 36 cells, not 36 colour
 * systems, because each option RE-TINTS the theme's own wash instead of
 * replacing it. Folding the grounds into the theme registry would have made
 * them eight more themes, each owing its own foreground, border, chip and
 * chart answers. See the long note at the top of the `data-bg` block in
 * src/index.css.
 *
 * THE ATTRIBUTE GOES ON <html>, not on a wrapper div, so that anything that
 * portals to document.body is covered too — and so that the blocking boot
 * script in index.html can stamp it before the first paint. The ground is the
 * largest painted area in the app; a flash of the wrong one on every reload
 * would be worse than a flash of the wrong theme.
 *
 * KEEP THREE COPIES IN STEP. The option keys exist here, in the CSS block, and
 * in that inline boot script. The script cannot import — it runs before the
 * bundle is requested, which is the whole point of it — so the duplication is
 * deliberate, exactly as it already is for the themes. Adding or removing an
 * option means all three.
 */

/* NOT 'pulse2-v2-theme' and NOT 'pulse2-theme': this is a separate axis with a
   separate lifetime, and the v1 engine src/context/ThemeContext.jsx owns the
   unnamespaced key. */
const BACKGROUND_STORAGE_KEY = 'pulse2-v2-bg'

/* `wint` is the ground the app has always had. It is the default, and the CSS
   block declares NOTHING for it — the switch there is guarded
   `[data-bg]:not([data-bg='wint'])` — so selecting it leaves --app-bg exactly
   as :root and the theme blocks declared it. Byte-identical by construction. */
const DEFAULT_BACKGROUND = 'wint'

/**
 * `labelKey` and `descKey` are i18n keys, not strings: the picker is
 * translated, and both en.json and he.json carry every key — this screen has
 * verified RTL and an untranslated key is its known failure mode.
 *
 * `swatchVar` is the custom property the picker paints the swatch with. It is
 * the SAME property the page ground reads under that option, so a swatch
 * cannot drift from the thing it is advertising. Do not replace it with a
 * hand-written preview colour.
 *
 * There is no `selectable: false` member here, as there is in the theme
 * registry: `contrast` is a diagnostic and has no counterpart on this axis.
 * Every option below is offered.
 */
export const SUPPORTED_BACKGROUNDS = [
  { key: 'wint', labelKey: 'more.backgrounds.wint', swatchVar: '--app-bg-option-wint' },
  { key: 'solid', labelKey: 'more.backgrounds.solid', swatchVar: '--app-bg-option-solid' },
  { key: 'horizon', labelKey: 'more.backgrounds.horizon', swatchVar: '--app-bg-option-horizon' },
  { key: 'aurora', labelKey: 'more.backgrounds.aurora', swatchVar: '--app-bg-option-aurora' },
  { key: 'opal', labelKey: 'more.backgrounds.opal', swatchVar: '--app-bg-option-opal' },
  { key: 'linen', labelKey: 'more.backgrounds.linen', swatchVar: '--app-bg-option-linen' },
  { key: 'frosted', labelKey: 'more.backgrounds.frosted', swatchVar: '--app-bg-option-frosted' },
  { key: 'depth', labelKey: 'more.backgrounds.depth', swatchVar: '--app-bg-option-depth' },
  { key: 'signal', labelKey: 'more.backgrounds.signal', swatchVar: '--app-bg-option-signal' },
]

function isBackground(key) {
  return SUPPORTED_BACKGROUNDS.some((b) => b.key === key)
}

/**
 * The same resolution order the blocking boot script in index.html runs:
 * ?bg= override first, then storage, then the default.
 *
 * ?bg= mirrors ?theme= and is not a debug affordance: 9 x 4 is 36 cells and
 * nothing in CI checks colour, so the verification pass drives them by URL.
 * On the deployed Pages site it doubles as a shareable review link.
 */
export function detectInitialBackground() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('bg')
    if (fromUrl && isBackground(fromUrl)) return fromUrl
  } catch { /* no window/URL — SSR or test env */ }
  try {
    const saved = localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (saved && isBackground(saved)) return saved
  } catch { /* localStorage unavailable */ }
  return DEFAULT_BACKGROUND
}

/** What is on <html> right now, falling back to a fresh detect. */
export function getBackground() {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.getAttribute('data-bg')
    if (current && isBackground(current)) return current
  }
  return detectInitialBackground()
}

/**
 * Stamp the ground.
 *
 * An unrecognised key falls back to the default rather than being written
 * through. That is not politeness: an unknown data-bg value leaves --bg-layers
 * undeclared in the CSS, and an undeclared var() in --app-bg is a BLANK PAGE
 * ROOT, not a slightly-off one. The CSS carries a transparent no-op fallback
 * for the same reason; this is the first of the two nets.
 *
 * No `.dark`-style class companion is toggled here — nothing in the stock
 * component set has a `bg:` variant, and the ground is reached only through
 * --app-bg and --drawer-plate.
 */
export function applyBackground(key) {
  const bg = SUPPORTED_BACKGROUNDS.find((b) => b.key === key) || SUPPORTED_BACKGROUNDS[0]
  if (typeof document === 'undefined') return bg.key
  document.documentElement.setAttribute('data-bg', bg.key)
  return bg.key
}

/** Persist and apply. Returns the key that was actually applied. */
export function setBackground(key) {
  const applied = applyBackground(key)
  try { localStorage.setItem(BACKGROUND_STORAGE_KEY, applied) } catch { /* ignore */ }
  return applied
}

export { BACKGROUND_STORAGE_KEY, DEFAULT_BACKGROUND }
