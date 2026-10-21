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
 * ICONS — lucide-react, not Material Symbols. The first build carried v1's
 * Material Symbols ligature glyphs across with the rest of the Info tab. That
 * made this the ONLY file in src/v2 drawing icons that way: every other v2
 * surface uses lucide-react or the project-owned set in src/v2/icons. The
 * glyph-for-glyph mapping is Material -> lucide:
 *   location_on   MapPin        home_pin    MapPinHouse   local_shipping Truck
 *   contacts      Contact       info        Info          shield         Shield
 *   tune          SlidersHorizontal         memory        Cpu
 *   square_foot   Ruler         image       ImageIcon     notes          NotepadText
 *   expand_more/_less  ChevronDown/ChevronUp               content_copy   Copy
 *   edit          Pencil        mail        Mail          phone          Phone
 *   add_a_photo   ImagePlus     ×           X
 * A side effect worth having: the ligature words ("square_foot") are gone from
 * textContent, so a by-text query can no longer trip over them.
 *
 * CONTROLS — shadcn <Button>. The edit / add / save / cancel / copy / remove
 * affordances were hand-rolled <button>s re-declaring a border, a radius, a
 * fill and a focus ring. They are Button variants now: `outline` for the ghost
 * affordances, `default` for Save, `ghost` for the two icon controls. The one
 * <button> left bare is the picture thumbnail, which is a full-bleed image
 * target, not a button chassis — Button's inline-flex centring would fight it.
 *
 * DATA — unchanged from v1, deliberately:
 *   getSystemInfo / getSystemSpecs   @/data/systemsInfo
 *   getAccountById                   @/data/accounts   (address / shipping /
 *                                    contacts, via the system's parent account)
 *   locationInfoStore                the two writes: notes + pictures
 *
 * TOKENS — Phase 3, docs/TOKENIZATION-PLAN.md (2026-10-21). Every
 * `var(--x, #hex)` in this file has been rewritten to the Tailwind utility
 * that paints the same value, and the fallback DELETED. The fallback was a
 * second, invisible source of truth that won whenever the token was missing,
 * with no warning and no visual tell; removing it makes a missing token fail
 * loudly. Nothing below renders differently — each value was resolved per
 * call site against what it already painted.
 *
 * Any note further down about keeping Figma's escaped `\/` token names
 * VERBATIM, and about String.raw being what carries the backslash, describes
 * the state BEFORE that pass. It is still the rule if an escaped name is ever
 * pasted back in from Figma — but no live class string in this file carries
 * one now, and a fresh paste should resolve the fallback hex to a utility.
 */

import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
  Contact,
  Copy,
  Cpu,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Mail,
  MapPin,
  MapPinHouse,
  NotepadText,
  Pencil,
  Phone,
  Ruler,
  Shield,
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
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


/* ------------------------------------------------------------ class atoms */
/* Line-height LAST in every one of these. See the header note. */

const CARD = String.raw`bg-surface-card border border-solid border-card relative rounded-[18px] shrink-0 w-full`

const HEADER = String.raw`flex w-full items-center gap-[10px] bg-transparent px-[18px] py-[14px] text-left cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-[18px]`

const HEADER_TITLE = String.raw`flex-1 font-semibold text-slate-800 text-sm tracking-[-0.2px] leading-5`

const PANEL = String.raw`flex flex-col gap-[7px] px-[18px] pb-[16px]`

const LABEL = String.raw`shrink-0 text-muted-foreground text-[13px] leading-[18px]`

const VALUE = String.raw`font-semibold inline-flex items-center gap-[6px] text-foreground text-[13px] text-right tabular-nums leading-[18px]`

const BODY_TEXT = String.raw`text-slate-800 text-[14px] whitespace-pre-line leading-[20px]`

const MUTED = String.raw`italic text-slate-400 text-[13px] leading-[18px]`

const LINK = String.raw`inline-flex items-center gap-[6px] text-primary text-[13px] no-underline leading-[18px]`

/* The small secondary affordance — Edit / Add notes / Add picture / Cancel.
   Everything structural (border, radius, focus ring, hover) comes from
   Button's `outline` variant; this only re-states the design's 13px type, the
   accent ink and the 6px gap. `bg-card` is #FFFFFF, i.e. what `bg-white` was,
   as a token; the variant's own `bg-background` is the page wash, not a chip. */
const GHOST_BUTTON = String.raw`h-auto self-start gap-[6px] rounded-[8px] border-border bg-card px-[12px] py-[6px] font-semibold text-primary text-[13px] leading-[18px]`

/* Save / Cancel inside the notes editor — the same 13px chip, so only the
   variant differs (`default` = bg-primary/text-primary-foreground for Save,
   `outline` + bg-card for Cancel). */
const EDITOR_BUTTON = String.raw`h-auto rounded-[8px] px-[14px] py-[6px] font-semibold text-[13px] leading-[18px]`

/* src/components/ui has `input` but no `textarea`, and notes are multi-line —
   so this one field stays a native <textarea>, wearing the shadcn input's own
   border / ring / radius tokens rather than literals. */
const TEXTAREA = String.raw`w-full resize-y rounded-[8px] border border-solid border-border bg-card px-[10px] py-[8px] text-foreground text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-[21px]`

const ICON_COLOR = String.raw`text-muted-foreground`
const CHEVRON_COLOR = String.raw`text-slate-400`

/* ----------------------------------------------------------------- pieces */

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
      <span className={`font-sans ${LABEL}`}>{label}</span>
      <span className={`font-sans ${VALUE}`}>
        {value}
        {copy && value ? (
          <Button
            type="button"
            variant="ghost"
            size={null}
            onClick={doCopy}
            aria-label={`Copy ${label}`}
            className={cn('size-[18px] rounded-[4px] p-0', ICON_COLOR, 'hover:text-current')}
          >
            <Copy className="size-[14px]" aria-hidden="true" />
          </Button>
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
  /* `icon` is a component, not a glyph name, since the Material Symbols
     ligatures were replaced. Bound to a capitalised local so JSX can render it
     — and as a local rather than a renamed param, because this config carries
     no eslint-plugin-react, so no rule tells no-unused-vars that JSX uses an
     identifier; `varsIgnorePattern: '^[A-Z_]'` covers a variable, nothing
     covers a destructured arg. */
  const Icon = icon
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
        <Icon className={cn('size-[18px] shrink-0', ICON_COLOR)} aria-hidden="true" />
        <span className={`font-sans ${HEADER_TITLE}`}>{title}</span>
        {open ? (
          <ChevronUp className={cn('size-[20px] shrink-0', CHEVRON_COLOR)} aria-hidden="true" />
        ) : (
          <ChevronDown className={cn('size-[20px] shrink-0', CHEVRON_COLOR)} aria-hidden="true" />
        )}
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
          className={`font-sans ${TEXTAREA}`}
        />
        <div className="flex justify-end gap-[8px]">
          <Button
            type="button"
            variant="outline"
            size={null}
            onClick={cancel}
            className={`font-sans ${EDITOR_BUTTON} border-border bg-card text-muted-foreground`}
          >
            {t('info_tab.cancel')}
          </Button>
          <Button
            type="button"
            size={null}
            onClick={save}
            className={`font-sans ${EDITOR_BUTTON}`}
          >
            {t('info_tab.save')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {value ? (
        <p className={`font-sans ${BODY_TEXT}`}>{value}</p>
      ) : (
        <p className={`font-sans ${MUTED}`}>{t('info_tab.placeholders.no_notes')}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size={null}
        onClick={startEdit}
        className={`font-sans ${GHOST_BUTTON}`}
      >
        <Pencil className="size-[14px]" aria-hidden="true" />
        {value ? t('info_tab.edit') : t('info_tab.add_notes')}
      </Button>
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
        <p className={`font-sans ${MUTED}`}>{t('info_tab.placeholders.no_pictures')}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-[6px]">
          {pictures.map((p, i) => (
            /* NOTE the single backslashes below: JSX string attributes do not
               process escapes, so a literal attribute spells the token the way
               Figma emits it, while the template-literal atoms above need two. */
            <div
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-[8px] bg-slate-100"
            >
              <button
                type="button"
                onClick={() => setLightbox(p)}
                aria-label={`Open picture ${i + 1}`}
                className="block size-full cursor-pointer p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <img src={p.dataUrl} alt="" className="block size-full object-cover" />
              </button>
              <Button
                type="button"
                variant="ghost"
                size={null}
                onClick={() => remove(p.id)}
                aria-label="Remove picture"
                className="absolute right-[4px] top-[4px] size-[22px] rounded-full bg-foreground/70 p-0 text-primary-foreground hover:bg-foreground/85 hover:text-primary-foreground"
              >
                <X className="size-[12px]" aria-hidden="true" />
              </Button>
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
      <Button
        type="button"
        variant="outline"
        size={null}
        onClick={() => fileInputRef.current?.click()}
        className={`font-sans ${GHOST_BUTTON}`}
      >
        <ImagePlus className="size-[14px]" aria-hidden="true" />
        {t('info_tab.add_picture')}
      </Button>

      {lightbox ? (
        /* Full-bleed viewer. A button rather than v1's <div onClick> so it can
           be dismissed from the keyboard; the image inside is decorative. */
        <button
          type="button"
          onClick={() => setLightbox(null)}
          aria-label="Close picture"
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-foreground/85 p-[20px]"
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

  const placeholder = (text) => <p className={`font-sans ${MUTED}`}>{text}</p>

  return (
    <div
      className={cn('flex w-full flex-col gap-[10px]', className)}
      data-testid="info-accordion"
    >
      {/* 1 · Location — conditional on info.location (v1 + PRD 04h row 1). */}
      {info.location ? (
        <InfoSection icon={MapPin} title={t('info_tab.sections.location')}>
          {locationRows.map((row) => (
            /* v1 draws these rows inline rather than through KV — no copy
               affordance and no tabular numerals on them. PRD 04h § "KV row
               anatomy" claims Location uses KV; the code does not, and the code
               is the truth here. Carried as the code has it. */
            <div key={row.label} className="flex items-center justify-between gap-[10px] py-[2px]">
              <span className={`font-sans ${LABEL}`}>{row.label}</span>
              <span
                className={`font-sans font-semibold text-foreground text-[13px] text-right leading-[18px]`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </InfoSection>
      ) : null}

      {/* 2 · Address */}
      <InfoSection icon={MapPinHouse} title={t('info_tab.sections.address')}>
        {address ? (
          <p className={`font-sans ${BODY_TEXT}`}>{address}</p>
        ) : (
          placeholder(t('info_tab.placeholders.no_address'))
        )}
      </InfoSection>

      {/* 3 · Shipping address — "Same as address" only when an address exists. */}
      <InfoSection icon={Truck} title={t('info_tab.sections.shipping_address')}>
        {shippingAddress ? (
          <p className={`font-sans ${BODY_TEXT}`}>{shippingAddress}</p>
        ) : address ? (
          placeholder(t('info_tab.placeholders.same_as_address'))
        ) : (
          placeholder(t('info_tab.placeholders.no_shipping'))
        )}
      </InfoSection>

      {/* 4 · Location contacts (N) — email + phone, no role. */}
      <InfoSection
        icon={Contact}
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
                    : 'border-t border-solid border-border pt-[10px]',
                )}
              >
                <span
                  className={`font-sans font-semibold text-foreground text-[14px] leading-[20px]`}
                >
                  {c.name}
                </span>
                {c.email ? (
                  <a href={`mailto:${c.email}`} className={`font-sans ${LINK}`}>
                    <Mail className="size-[14px] shrink-0" aria-hidden="true" />
                    {c.email}
                  </a>
                ) : null}
                {c.phone ? (
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} className={`font-sans ${LINK}`}>
                    <Phone className="size-[14px] shrink-0" aria-hidden="true" />
                    {c.phone}
                  </a>
                ) : null}
              </div>
            ))}
      </InfoSection>

      {/* 5 · About — conditional on info.description. */}
      {info.description ? (
        <InfoSection icon={Info} title={t('info_tab.sections.about')}>
          <p
            className={`font-sans text-slate-600 text-[14px] leading-[22px]`}
          >
            {info.description}
          </p>
        </InfoSection>
      ) : null}

      {/* 6 · Protects — conditional on a non-empty info.protects. */}
      {info.protects?.length > 0 ? (
        <InfoSection icon={Shield} title={t('info_tab.sections.protects')}>
          {info.protects.map((p, i) => (
            <div key={`${i}-${p}`} className="flex items-center gap-[8px]">
              <span
                className="size-[6px] shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <span
                className={`font-sans text-slate-800 text-[14px] leading-[20px]`}
              >
                {p}
              </span>
            </div>
          ))}
        </InfoSection>
      ) : null}

      {/* 7 · General */}
      <InfoSection icon={SlidersHorizontal} title={t('info_tab.sections.general')}>
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
      <InfoSection icon={Cpu} title={t('info_tab.sections.device_type')}>
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
      <InfoSection icon={Ruler} title={t('info_tab.sections.coverage')}>
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
      <InfoSection icon={ImageIcon} title={t('info_tab.sections.pictures')}>
        <PicturesEditor scopeId={scopeId} />
      </InfoSection>

      {/* 11 · Notes — editable, persisted via locationInfoStore. */}
      <InfoSection icon={NotepadText} title={t('info_tab.sections.notes')}>
        <NotesEditor scopeId={scopeId} defaultNotes={defaultNotes} />
      </InfoSection>
    </div>
  )
}
