/**
 * InfoAccordion — the System page's "General Info" content, as a collapsed
 * accordion group that drops into the bottom of the v2 Overview scroll.
 *
 * PROVENANCE. This is NOT a new design. It is `src/screens/systems/
 * SystemInfoTab.jsx` (v1, 386 lines) carried across: same eleven sections in
 * the same order, same data wiring, same two edit affordances. PRD 04h
 * ("Mirrors current React") documents that file; where the PRD and the v1 code
 * disagreed the code won, per the PRD's own framing. The v1 file is untouched
 * — v1 still renders it on the System Detail Info tab.
 *
 * WHAT CHANGED, and why:
 *
 *   1. The scope header is GONE. v1 opened with the system name (18/700) and
 *      `{l4Name} · {l3Name}` beneath it. The v2 System page already carries the
 *      system name as its own H1 and is growing a parent-location control, so
 *      the header would have said everything twice. Everything below it is
 *      carried over unchanged.
 *
 *   2. The section headers are real buttons. v1 toggled on a `<div onClick>`
 *      with no role and no state exposed to assistive tech. Each header here is
 *      a `<button type="button">` carrying `aria-expanded` and an
 *      `aria-controls` that points at its panel; the panel carries the matching
 *      id and `role="region"` + `aria-labelledby`. The body still renders ONLY
 *      when open (not hidden with CSS) — the collapsed page stays cheap.
 *
 *   3. The serial's copy control is a button with an aria-label. v1 hung
 *      `onClick` on a bare `<span title="Copy">`, which keyboards and screen
 *      readers could not reach. Same `navigator.clipboard.writeText` behind it.
 *
 *   4. The card shell is the v2 house shell (ActivePolicyCard 199296:50268 /
 *      SystemTypeCard 199296:50210): `bg-[#fafbfc]`, white 1px border,
 *      `rounded-[var(--rounded-2xl,18px)]`, `w-full`. v1 drew its own 12px
 *      radius card with a drop shadow off the v1 ThemeContext; nothing in v2
 *      consumes that context, so the colours here are the v2 slate tokens.
 *
 * NO SCROLL-JUMP. Expanding a section must not move its header. NN/g's
 * documented mobile-accordion failure is exactly that: the panel opens, the
 * page scrolls, and the header the user just tapped is pushed off-screen. So
 * nothing in this file calls `scrollIntoView`, `scrollTo`, or `focus()` on
 * expand. The panel renders after the header in normal flow and the header
 * stays where the finger left it. There is a test pinning this.
 *
 * CLASS STRINGS — the repo's `cn()` trap. `cn()` runs tailwind-merge, which
 * treats a `leading-*` atom as conflicting with a font-size atom (Tailwind's
 * `text-sm/6` shorthand sets both) and SILENTLY DROPS a `leading-` that sits
 * before a `text-[...]`. Every atom below therefore puts its line-height LAST,
 * and the atoms are composed with template literals rather than through `cn()`
 * wherever a conditional is involved. The atoms are `String.raw` because the
 * design-token class names contain escaped slashes
 * (`text-[color:var(--colors\/slate\/500,#62748e)]`) and a plain JS string
 * eats the backslash, after which the class never reaches the DOM.
 *
 * DATA — unchanged from v1, deliberately:
 *   getSystemInfo / getSystemSpecs   @/data/systemsInfo
 *   getAccountById                   @/data/accounts   (address / shipping /
 *                                    contacts, via the system's parent account)
 *   locationInfoStore                the two writes: notes + pictures
 */

import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { getSystemInfo, getSystemSpecs } from '@/data/systemsInfo'
import { getAccountById } from '@/data/accounts'
import {
  getNotesOverride,
  setNotes,
  getPictures,
  addPicture,
  removePicture,
} from '@/data/locationInfoStore'

/* ------------------------------------------------------------------ fonts */

const FIG_REG = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Regular'),'Figtree','Inter',sans-serif]`
const FIG_MED = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:Medium'),'Figtree','Inter',sans-serif]`
const FIG_SEMI = String.raw`font-[family-name:var(--font\/family\/sans,'Figtree:SemiBold'),'Figtree','Inter',sans-serif]`

/* ------------------------------------------------------------ class atoms */
/* Line-height LAST in every one of these. See the header note. */

const CARD = String.raw`bg-[#fafbfc] border border-solid border-white relative rounded-[var(--rounded-2xl,18px)] shrink-0 w-full`

const HEADER = String.raw`flex w-full items-center gap-[10px] bg-transparent px-[18px] py-[14px] text-left cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-[var(--rounded-2xl,18px)]`

const HEADER_TITLE = String.raw`flex-1 font-[var(--font\/weight\/font-semibold,600)] text-[color:var(--colors\/slate\/800,#1d293d)] text-[length:var(--text\/sm\/size,14px)] tracking-[-0.2px] leading-[var(--text\/sm\/lh,20px)]`

const PANEL = String.raw`flex flex-col gap-[7px] px-[18px] pb-[16px]`

const LABEL = String.raw`shrink-0 text-[color:var(--colors\/slate\/500,#62748e)] text-[13px] leading-[18px]`

const VALUE = String.raw`font-[var(--font\/weight\/font-semibold,600)] inline-flex items-center gap-[6px] text-[color:var(--colors\/slate\/900,#0f172b)] text-[13px] text-right tabular-nums leading-[18px]`

const BODY_TEXT = String.raw`text-[color:var(--colors\/slate\/800,#1d293d)] text-[14px] whitespace-pre-line leading-[20px]`

const MUTED = String.raw`italic text-[color:var(--colors\/slate\/400,#90a1b9)] text-[13px] leading-[18px]`

const LINK = String.raw`inline-flex items-center gap-[6px] text-[color:var(--wint-blue-accent,#0b81f8)] text-[13px] no-underline leading-[18px]`

const GHOST_BUTTON = String.raw`inline-flex items-center gap-[6px] self-start rounded-[8px] border border-solid border-[var(--colors\/slate\/200,#e2e8f0)] bg-white px-[12px] py-[6px] cursor-pointer font-[var(--font\/weight\/font-semibold,600)] text-[color:var(--wint-blue-accent,#0b81f8)] text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-[18px]`

const ICON_COLOR = String.raw`text-[color:var(--colors\/slate\/500,#62748e)]`
const CHEVRON_COLOR = String.raw`text-[color:var(--colors\/slate\/400,#90a1b9)]`

/* ----------------------------------------------------------------- pieces */

/* Material Symbols is loaded app-wide (index.html + index.css). v1's Info tab
   is drawn with it and PRD 04h names its sections by Material glyph, so the
   glyph set carries over verbatim rather than being re-mapped onto Lucide.
   Always aria-hidden: the ligature text ("location_on") is the font's input,
   not a label, and would otherwise pollute every by-text query. */
function MIcon({ name, size = 18, className }) {
  return (
    <span
      className={cn('material-symbols-outlined shrink-0', className)}
      aria-hidden="true"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name}
    </span>
  )
}

/* Label-left / value-right row. v1's `KV`, with the copy affordance promoted
   from a <span onClick> to a real button. */
function KV({ label, value, copy = false }) {
  function doCopy() {
    if (!value) return
    try {
      navigator.clipboard?.writeText(String(value))
    } catch {
      /* clipboard is permission-gated and absent in non-secure contexts —
         v1 swallowed the throw too, and there is nothing useful to say. */
    }
  }

  return (
    <div className="flex items-center justify-between gap-[10px] py-[2px]">
      <span className={`${FIG_REG} ${LABEL}`}>{label}</span>
      <span className={`${FIG_SEMI} ${VALUE}`}>
        {value}
        {copy && value ? (
          <button
            type="button"
            onClick={doCopy}
            aria-label={`Copy ${label}`}
            className="inline-flex cursor-pointer bg-transparent p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <MIcon name="content_copy" size={14} className={ICON_COLOR} />
          </button>
        ) : null}
      </span>
    </div>
  )
}

/**
 * One foldable section. Collapsed by default — ALL of them, every render, per
 * PRD 04h ("Foldable sections - all collapsed by default"). There is no
 * `defaultOpen` escape hatch here: v1 had one and nothing ever passed it, and
 * an accordion group at the foot of a long scroll must not open itself.
 */
function InfoSection({ icon, title, children }) {
  const [open, setOpen] = useState(false)
  const uid = useId()
  const headerId = `${uid}-header`
  const panelId = `${uid}-panel`

  return (
    <div className={CARD} data-info-section={title}>
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        /* Toggle and nothing else. No scrollIntoView, no focus move — see the
           NO SCROLL-JUMP note at the top of this file. */
        onClick={() => setOpen((o) => !o)}
        className={HEADER}
      >
        <MIcon name={icon} size={18} className={ICON_COLOR} />
        <span className={`${FIG_SEMI} ${HEADER_TITLE}`}>{title}</span>
        <MIcon
          name={open ? 'expand_less' : 'expand_more'}
          size={20}
          className={CHEVRON_COLOR}
        />
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={headerId} className={PANEL}>
          {children}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------- Notes (editable) */

function NotesEditor({ scopeId, defaultNotes }) {
  const { t } = useTranslation()
  const [override, setOverride] = useState(() => getNotesOverride(scopeId))
  const value = override ?? defaultNotes ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }
  function save() {
    /* The write. locationInfoStore owns persistence (localStorage, one key per
       scope); the component only mirrors it so the panel repaints. */
    setNotes(scopeId, draft)
    setOverride(draft)
    setEditing(false)
  }
  function cancel() {
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-[8px]">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          aria-label={t('info_tab.sections.notes')}
          placeholder="Add notes for this system…"
          className={`${FIG_REG} w-full resize-y rounded-[8px] border border-solid border-[var(--colors\\/slate\\/200,#e2e8f0)] bg-white px-[10px] py-[8px] text-[color:var(--colors\\/slate\\/900,#0f172b)] text-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-[21px]`}
        />
        <div className="flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={cancel}
            className={`${FIG_SEMI} rounded-[8px] border border-solid border-[var(--colors\\/slate\\/200,#e2e8f0)] bg-white px-[14px] py-[6px] cursor-pointer font-[var(--font\\/weight\\/font-semibold,600)] text-[color:var(--colors\\/slate\\/500,#62748e)] text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-[18px]`}
          >
            {t('info_tab.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            className={`${FIG_SEMI} rounded-[8px] bg-[var(--wint-blue-accent,#0b81f8)] px-[14px] py-[6px] cursor-pointer font-[var(--font\\/weight\\/font-semibold,600)] text-white text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-[18px]`}
          >
            {t('info_tab.save')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {value ? (
        <p className={`${FIG_REG} ${BODY_TEXT}`}>{value}</p>
      ) : (
        <p className={`${FIG_REG} ${MUTED}`}>{t('info_tab.placeholders.no_notes')}</p>
      )}
      <button type="button" onClick={startEdit} className={`${FIG_SEMI} ${GHOST_BUTTON}`}>
        <MIcon name="edit" size={14} />
        {value ? t('info_tab.edit') : t('info_tab.add_notes')}
      </button>
    </div>
  )
}

/* ---------------------------------------------------- Pictures (editable) */

function PicturesEditor({ scopeId }) {
  const { t } = useTranslation()
  const [pictures, setPictures] = useState(() => getPictures(scopeId))
  const [lightbox, setLightbox] = useState(null)
  const fileInputRef = useRef(null)

  function refresh() {
    setPictures(getPictures(scopeId))
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    let pending = files.length
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') addPicture(scopeId, reader.result)
        pending -= 1
        if (pending === 0) refresh()
      }
      reader.onerror = () => {
        pending -= 1
        if (pending === 0) refresh()
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function remove(id) {
    removePicture(scopeId, id)
    refresh()
    if (lightbox && lightbox.id === id) setLightbox(null)
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {pictures.length === 0 ? (
        <p className={`${FIG_REG} ${MUTED}`}>{t('info_tab.placeholders.no_pictures')}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-[6px]">
          {pictures.map((p, i) => (
            /* NOTE the single backslashes below: JSX string attributes do not
               process escapes, so a literal attribute spells the token the way
               Figma emits it, while the template-literal atoms above need two. */
            <div
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-[8px] bg-[var(--colors\/slate\/100,#f1f5f9)]"
            >
              <button
                type="button"
                onClick={() => setLightbox(p)}
                aria-label={`Open picture ${i + 1}`}
                className="block size-full cursor-pointer p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <img src={p.dataUrl} alt="" className="block size-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Remove picture"
                className="absolute right-[4px] top-[4px] flex size-[22px] cursor-pointer items-center justify-center rounded-full bg-[rgba(20,21,26,0.7)] p-0 font-semibold text-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 text-[14px] leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
        data-testid="info-picture-input"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`${FIG_SEMI} ${GHOST_BUTTON}`}
      >
        <MIcon name="add_a_photo" size={14} />
        {t('info_tab.add_picture')}
      </button>

      {lightbox ? (
        /* Full-bleed viewer. A button rather than v1's <div onClick> so it can
           be dismissed from the keyboard; the image inside is decorative. */
        <button
          type="button"
          onClick={() => setLightbox(null)}
          aria-label="Close picture"
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-[rgba(0,0,0,0.85)] p-[20px]"
        >
          <img
            src={lightbox.dataUrl}
            alt=""
            className="max-h-full max-w-full rounded-[8px] object-contain"
          />
        </button>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------- main */

/**
 * @param {object}  props
 * @param {object}  [props.system]    the system record (v1 calls it `sys`).
 *                                    Supplies `id` and `account`.
 * @param {string}  [props.systemId]  overrides `system.id`; the scope key that
 *                                    locationInfoStore writes under.
 * @param {string}  [props.className] merged onto the group wrapper.
 */
export default function InfoAccordion({ system, systemId, className }) {
  const { t } = useTranslation()

  const scopeId = systemId ?? system?.id
  const info = getSystemInfo(scopeId)
  const specs = getSystemSpecs(scopeId)

  /* v1, verbatim: address / shipping / contacts are location-level fields that
     the mockup borrows from the system's parent account. PRD 04h § Open
     questions flags this as a known shortcut — the real product stores them on
     the location record. Not this component's call to fix. */
  const account = (() => {
    const accId = system?.account
    if (!accId) return null
    const a = getAccountById(accId)
    return a?.parentId ? getAccountById(a.parentId) : a
  })()

  const address = account?.address || ''
  const shippingAddress = account?.shippingAddress || ''
  const contacts = account?.contacts || []
  const defaultNotes = '' // System-level notes start empty; user-editable.

  const locationRows = info.location
    ? [
        { label: t('info_tab.location_fields.building'), value: info.location.building },
        { label: t('info_tab.location_fields.campus'), value: info.location.campus },
        { label: t('info_tab.location_fields.floor'), value: info.location.floor },
        { label: t('info_tab.location_fields.zone'), value: info.location.zone },
        { label: t('info_tab.location_fields.room'), value: info.location.room },
      ].filter((r) => r.value)
    : []

  const placeholder = (text) => <p className={`${FIG_REG} ${MUTED}`}>{text}</p>

  return (
    <div
      className={cn('flex w-full flex-col gap-[10px]', className)}
      data-testid="info-accordion"
    >
      {/* 1 · Location — conditional on info.location (v1 + PRD 04h row 1). */}
      {info.location ? (
        <InfoSection icon="location_on" title={t('info_tab.sections.location')}>
          {locationRows.map((row) => (
            /* v1 draws these rows inline rather than through KV — no copy
               affordance and no tabular numerals on them. PRD 04h § "KV row
               anatomy" claims Location uses KV; the code does not, and the code
               is the truth here. Carried as the code has it. */
            <div key={row.label} className="flex items-center justify-between gap-[10px] py-[2px]">
              <span className={`${FIG_REG} ${LABEL}`}>{row.label}</span>
              <span
                className={`${FIG_SEMI} font-[var(--font\\/weight\\/font-semibold,600)] text-[color:var(--colors\\/slate\\/900,#0f172b)] text-[13px] text-right leading-[18px]`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </InfoSection>
      ) : null}

      {/* 2 · Address */}
      <InfoSection icon="home_pin" title={t('info_tab.sections.address')}>
        {address ? (
          <p className={`${FIG_REG} ${BODY_TEXT}`}>{address}</p>
        ) : (
          placeholder(t('info_tab.placeholders.no_address'))
        )}
      </InfoSection>

      {/* 3 · Shipping address — "Same as address" only when an address exists. */}
      <InfoSection icon="local_shipping" title={t('info_tab.sections.shipping_address')}>
        {shippingAddress ? (
          <p className={`${FIG_REG} ${BODY_TEXT}`}>{shippingAddress}</p>
        ) : address ? (
          placeholder(t('info_tab.placeholders.same_as_address'))
        ) : (
          placeholder(t('info_tab.placeholders.no_shipping'))
        )}
      </InfoSection>

      {/* 4 · Location contacts (N) — email + phone, no role. */}
      <InfoSection
        icon="contacts"
        title={`${t('info_tab.sections.location_contacts')}${contacts.length ? ` (${contacts.length})` : ''}`}
      >
        {contacts.length === 0
          ? placeholder(t('info_tab.placeholders.no_contacts'))
          : contacts.map((c, i) => (
              <div
                key={c.email || c.name || i}
                className={cn(
                  'flex flex-col gap-[4px]',
                  i === 0
                    ? 'pt-[2px]'
                    : 'border-t border-solid border-[var(--colors\\/slate\\/200,#e2e8f0)] pt-[10px]',
                )}
              >
                <span
                  className={`${FIG_SEMI} font-[var(--font\\/weight\\/font-semibold,600)] text-[color:var(--colors\\/slate\\/900,#0f172b)] text-[14px] leading-[20px]`}
                >
                  {c.name}
                </span>
                {c.email ? (
                  <a href={`mailto:${c.email}`} className={`${FIG_REG} ${LINK}`}>
                    <MIcon name="mail" size={14} />
                    {c.email}
                  </a>
                ) : null}
                {c.phone ? (
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} className={`${FIG_REG} ${LINK}`}>
                    <MIcon name="phone" size={14} />
                    {c.phone}
                  </a>
                ) : null}
              </div>
            ))}
      </InfoSection>

      {/* 5 · About — conditional on info.description. */}
      {info.description ? (
        <InfoSection icon="info" title={t('info_tab.sections.about')}>
          <p
            className={`${FIG_REG} text-[color:var(--colors\\/slate\\/700,#45556c)] text-[14px] leading-[22px]`}
          >
            {info.description}
          </p>
        </InfoSection>
      ) : null}

      {/* 6 · Protects — conditional on a non-empty info.protects. */}
      {info.protects?.length > 0 ? (
        <InfoSection icon="shield" title={t('info_tab.sections.protects')}>
          {info.protects.map((p, i) => (
            <div key={`${i}-${p}`} className="flex items-center gap-[8px]">
              <span
                className="size-[6px] shrink-0 rounded-full bg-[var(--wint-blue-accent,#0b81f8)]"
                aria-hidden="true"
              />
              <span
                className={`${FIG_REG} text-[color:var(--colors\\/slate\\/800,#1d293d)] text-[14px] leading-[20px]`}
              >
                {p}
              </span>
            </div>
          ))}
        </InfoSection>
      ) : null}

      {/* 7 · General */}
      <InfoSection icon="tune" title={t('info_tab.sections.general')}>
        <KV label={t('info_tab.general_fields.pipe_topology')} value={specs.pipeTopology} />
        <KV label={t('info_tab.general_fields.valve_model')} value={specs.valveModel} />
        <KV
          label={t('info_tab.general_fields.monitored_environment')}
          value={specs.monitoredEnvironment}
        />
        <KV label={t('info_tab.general_fields.meter_model')} value={specs.meterModel} />
      </InfoSection>

      {/* 8 · Device type — the four info.* rows render only when present, as
          in v1. With this repo's upstream dataset `serialNumber` is null on
          every real system, so the copy control is genuinely absent there. */}
      <InfoSection icon="memory" title={t('info_tab.sections.device_type')}>
        <KV label={t('info_tab.device_fields.device_family')} value={specs.deviceFamily} />
        {info.manufacturer ? (
          <KV label={t('info_tab.device_fields.manufacturer')} value={info.manufacturer} />
        ) : null}
        {info.model ? (
          <KV label={t('info_tab.device_fields.model')} value={info.model} />
        ) : null}
        {info.serialNumber ? (
          <KV label={t('info_tab.device_fields.serial_number')} value={info.serialNumber} copy />
        ) : null}
        {info.installDate ? (
          <KV
            label={t('info_tab.device_fields.install_date')}
            value={new Date(info.installDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          />
        ) : null}
      </InfoSection>

      {/* 9 · Coverage */}
      <InfoSection icon="square_foot" title={t('info_tab.sections.coverage')}>
        <KV
          label={t('info_tab.coverage_fields.coverage_area')}
          value={`${specs.coverageArea.toLocaleString()} m²`}
        />
        <KV
          label={t('info_tab.coverage_fields.occupancy')}
          value={specs.occupancy.toLocaleString()}
        />
      </InfoSection>

      {/* 10 · Pictures — editable, persisted via locationInfoStore. */}
      <InfoSection icon="image" title={t('info_tab.sections.pictures')}>
        <PicturesEditor scopeId={scopeId} />
      </InfoSection>

      {/* 11 · Notes — editable, persisted via locationInfoStore. */}
      <InfoSection icon="notes" title={t('info_tab.sections.notes')}>
        <NotesEditor scopeId={scopeId} defaultNotes={defaultNotes} />
      </InfoSection>
    </div>
  )
}
