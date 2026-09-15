/**
 * Valve status — v2.
 * Design source: Figma 197639:253443 "Valve status", all five variants:
 *   Open 197639:253442 · Closed 197639:253444 · Error 197639:253461
 *   Unknown 197972:32529 · No valve 197662:12993
 *
 * Geometry is the exported Figma asset verbatim, not a redraw. The frame sizes
 * the glyph at 16px; the artwork inside is ~11.1x11.6 for the valve states and
 * fills the box for "no valve", which is why each variant carries its own
 * viewBox rather than a shared one.
 */

const VARIANTS = {
  'open': {
    viewBox: '0 0 12.5282 12',
    paths: (
      <>
        <g>
        <path d="M6.26407 1.97985V0.528165" stroke="#0B82F8" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M3.13643 0.442587H9.39166" stroke="#0B82F8" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M10.327 7.44726C10.327 9.6956 8.50354 11.5191 6.2552 11.5191C4.00686 11.5191 2.1834 9.6956 2.1834 7.44726C2.1834 7.38825 2.1834 7.32924 2.1893 7.27023H2.34568C3.33117 7.27023 3.33117 8.10819 4.31667 8.10819C5.30216 8.10819 5.30216 7.27023 6.28765 7.27023C7.27315 7.27023 7.27315 8.10819 8.25864 8.10819C9.24413 8.10819 9.24708 7.27023 10.2326 7.27023H10.3211C10.327 7.32924 10.327 7.38825 10.327 7.44726Z" fill="#B0D8FF"/>
        <path d="M6.2877 11.5574C8.56583 11.5574 10.4126 9.71062 10.4126 7.43249C10.4126 5.15437 8.56583 3.30759 6.2877 3.30759C4.00958 3.30759 2.1628 5.15437 2.1628 7.43249C2.1628 9.71062 4.00958 11.5574 6.2877 11.5574Z" stroke="#0B82F8" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M0.442587 7.27023H2.34571C3.3312 7.27023 3.3312 8.10819 4.3167 8.10819C5.30219 8.10819 5.30219 7.27023 6.28768 7.27023C7.27317 7.27023 7.27317 8.10819 8.25867 8.10819C9.24416 8.10819 9.24711 7.27023 10.2326 7.27023H12.0856" stroke="#0B82F8" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        </g>
      </>
    ),
  },
  'closed': {
    viewBox: '0 0 9.14 12.01',
    paths: (
      <>
        <g>
        <path d="M4.575 11.565C6.855 11.565 8.695 9.715 8.695 7.445C8.695 5.175 6.845 3.325 4.575 3.325C2.305 3.325 0.445 5.155 0.445 7.435C0.445 9.715 2.295 11.555 4.565 11.555L4.575 11.565Z" fill="#E2E8F0" stroke="#45556C" strokeWidth="0.89" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M6.84981 6.73318L5.28004 5.1634C4.88951 4.77287 4.25635 4.77287 3.86582 5.1634L2.29605 6.73318C1.90552 7.1237 1.90552 7.75686 2.29605 8.14739L3.86582 9.71717C4.25635 10.1077 4.88951 10.1077 5.28004 9.71717L6.84981 8.14739C7.24034 7.75686 7.24034 7.1237 6.84981 6.73318Z" fill="#45556C"/>
        <path d="M4.57488 1.985V0.534996" stroke="#45556C" strokeWidth="0.89" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M1.445 0.445H7.705" stroke="#45556C" strokeWidth="0.89" strokeMiterlimit="10" strokeLinecap="round"/>
        </g>
      </>
    ),
  },
  'error': {
    viewBox: '0 0 12.5281 12',
    paths: (
      <>
        <g>
        <path d="M6.26408 11.5574C8.5422 11.5574 10.389 9.71062 10.389 7.43249C10.389 5.15437 8.5422 3.30759 6.26408 3.30759C3.98595 3.30759 2.13917 5.15437 2.13917 7.43249C2.13917 9.71062 3.98595 11.5574 6.26408 11.5574Z" fill="#FCD7DB" stroke="#FB2C36" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M6.26407 1.97985V0.528165" stroke="#FB2C36" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M3.1365 0.442587H9.39173" stroke="#FB2C36" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <g>
        <path d="M1.84706 7H0.442587" stroke="#FB2C36" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M12.0855 7.00002H10.6811" stroke="#FB2C36" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        </g>
        <path d="M6.26407 5.00122V7.87803" stroke="#FB2C36" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M6.26404 10.2031C6.60462 10.2031 6.88072 9.92701 6.88072 9.58644C6.88072 9.24586 6.60462 8.96976 6.26404 8.96976C5.92347 8.96976 5.64737 9.24586 5.64737 9.58644C5.64737 9.92701 5.92347 10.2031 6.26404 10.2031Z" fill="#FB2C36"/>
        </g>
      </>
    ),
  },
  'unknown': {
    viewBox: '0 0 12.5281 12',
    paths: (
      <>
        <g>
        <path d="M6.26408 11.5574C8.5422 11.5574 10.389 9.71062 10.389 7.43249C10.389 5.15437 8.5422 3.30759 6.26408 3.30759C3.98595 3.30759 2.13917 5.15437 2.13917 7.43249C2.13917 9.71062 3.98595 11.5574 6.26408 11.5574Z" fill="#F1F5F9" stroke="#CAD5E2" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round" strokeDasharray="1.77 1.77"/>
        <path d="M6.26407 1.97985V0.528165" stroke="#CAD5E2" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M3.1365 0.442587H9.39173" stroke="#CAD5E2" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <g>
        <path d="M1.84706 7.43249H0.442587" stroke="#CAD5E2" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        <path d="M12.0855 7.00002H10.6811" stroke="#CAD5E2" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        </g>
        </g>
      </>
    ),
  },
  'no-valve': {
    viewBox: '0 0 16 16',
    paths: (
      <>
        <g>
        <line x1="4.44259" y1="8.55741" x2="11.5574" y2="8.55741" stroke="#CAD5E2" strokeWidth="0.885173" strokeMiterlimit="10" strokeLinecap="round"/>
        </g>
      </>
    ),
  },
}

// Valid `state` values: open | closed | error | unknown | no-valve.
// Deliberately not exported as a constant — a second export here costs the file
// its fast-refresh boundary (react-refresh/only-export-components).

export default function ValveStatus({ state = 'open', size = 16, className, title, ...props }) {
  const v = VARIANTS[state] ?? VARIANTS.open
  return (
    <svg
      width={size}
      height={size}
      viewBox={v.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {v.paths}
    </svg>
  )
}
