// Push Simulator - the demo notification pusher.
//
// One pusher tool, accessed at /push. Old /control + /push-panel redirect here.
// Always publishes via BOTH ntfy.sh (for paired phones / cross-device) AND
// BroadcastChannel (for same-browser tabs - instant, no internet needed).
//
// Layout: top row is the two numbered setup steps (pair a phone, pick the
// profile), then one section grid per PUSH_SECTIONS entry (Water Events /
// Valve / Power / Communication / Sensors), then the live + recent tables.
// Each card keeps its variant selector, its configurable params and its Fire
// button - the desktop pusher is the RICH surface, unlike the on-phone sheet.
//
// V10.9 IDs sourced from src/data/pushCatalog.js. No invented labels.
//
// ── PRESENTATION PORT, 2026-11-01 ─────────────────────────────────────────
// This file used to carry its own `styles` object: an inline font-family
// declaration pinning Inter, ~40 raw hex values and 34 live Material Symbols.
// (The declaration is NOT quoted here — quoting it verbatim would trip the
// very grep used to check it is gone.) None of that was the product's. The
// owner's note was
// that the pusher "still looks like the old one - old icons, old fonts, old
// descriptions"; the four phone surfaces had already been cleaned, so this was
// the screen they meant.
//
// What changed is ONLY presentation:
//   type     the fontFamily declaration is gone, so the page inherits Figtree
//            from html/body (index.css:818). Titles are font-semibold and
//            controls font-medium - 700/800 are outside this system's
//            vocabulary (see ui/button.jsx:7). Line-heights are pinned px.
//   colour   tokens from src/index.css. The three deliberate exceptions are
//            called out at their use sites: the catalogue's own `tint`, the
//            personas' own avatar `bg`/`color`, and the QR quiet zone.
//   icons    every Material Symbol is gone; the table below says what each
//            one became and what that was matched against.
//   chassis  src/components/ui primitives - Card, Button, Badge, Input,
//            Separator, Table.
//
// What did NOT change, and must not: the ntfy bridge, the ?p= pairing flow,
// the QR, payloadMeta (imported from src/lib/pushPayload.js precisely so the
// desktop panel and the on-phone sheet cannot drift - do NOT inline it back),
// the catalogue, PUSH_SECTIONS, each entry's eligibility(s) gating, the
// variant pickers, the param editors, and every string. Labels come from the
// catalogue and notification text from src/utils/pushText.js, which is V11
// verbatim. No copy is written here.

import { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  ChevronDown,
  CircleCheck,
  Gauge,
  History,
  Play,
  Plug,
  PowerOff,
  Trash2,
  Wifi,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Clock01, Warning, Waves, WifiDisconnected02 } from '@/v2/icons';
import ValveStatus from '@/v2/components/ValveStatus';
import { cn } from '@/lib/utils';
import { SYSTEMS } from '../data/systems';
import { PERSONAS, DEFAULT_PERSONA } from '../data/personas';
import { getSimulatedAlerts } from '../data/simulatedAlerts';
import { useUserContext } from '../context/UserContext';
import { publish as bridgePublish, getRoom, getOrCreatePusherRoom, isRateLimited, getRateLimitReason, onRateLimitChange } from '../lib/pushBridge';
import { applyPushEvent, applyDemoReset } from '../lib/pushEvents';
import { PUSH_SECTIONS, PUSH_CATALOG } from '../data/pushCatalog';

const channel = new BroadcastChannel('pulse2-push');

// ─── Helpers ────────────────────────────────────────────────────────────────

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function initials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ─── Notification text builders — V11.0 verbatim ───────────────────────────
// V11_TEMPLATES + buildPushText extracted to src/utils/pushText.js so unit
// tests can exercise them directly. See that file for the full catalogue.

import { buildPushText } from '../utils/pushText';
// payloadMeta extracted to src/lib/pushPayload.js so the phone-side push-sim
// sheet fires the identical payload rather than a second copy of this mapping.
// Moved verbatim; nothing about /push behaves differently.
import { payloadMeta } from '../lib/pushPayload';

// ─── Glyphs ─────────────────────────────────────────────────────────────────
//
// `card.glyph` is a Material Symbol NAME and it still travels in the payload
// (`icon: card.glyph` in fireCard) because the receiving surfaces read it.
// This table is the pusher's own RENDERING of that concept — it does not touch
// the catalogue, and the payload is byte-identical to before.
//
// Each row was matched against a surface that already draws the same concept,
// not chosen for looks. The audit precedent that forced this: the notification
// drew `Droplets` for a water event while every other surface drew `Waves`, and
// `Droplets` is the FLAT-CONSUMPTION glyph. So:
//
//   WA   water event           Waves           AlertCard.jsx:430/718/938,
//                                              EventsTimelineCard.jsx:619,
//                                              TriageBand.jsx:141,
//                                              FilterOptionIcon 'event' →
//                                              leak-high / leak-low
//   OL   ongoing reminder      Clock01         ActivePolicyCard's policy-window
//                                              clock; Figma names the node
//                                              "time, alarm"
//   SO   shutoff level         ValveStatus     FilterOptionIcon 'valve' →
//        reached               closed          closed; this is the moment the
//                                              valve shuts, which is also why
//                                              the catalogue gives it `block`
//                                              and the same tint as VC_S_02
//   VC_S_02  valve closing     ValveStatus closed      same
//   VC_OK_01 valve closed by user  ValveStatus closed  same
//   V_ER     valve error       ValveStatus error       FilterOptionIcon 'valve'
//                                                      → error, 'event' →
//                                                      valve-error
//   SEN_01   valve disconnected ValveStatus unknown    the dashed variant is
//                                                      "we cannot read it",
//                                                      which is what a
//                                                      disconnected valve is.
//                                                      'no-valve' means the
//                                                      system HAS no valve and
//                                                      would be wrong here
//   SEN_02   valve reconnected  ValveStatus open       FilterOptionIcon 'valve'
//                                                      → open
//   VC_OK_02 / LE_01 / V_ER_04  CircleCheck            FilterOptionIcon
//            resolved                                  'attention' → clear,
//                                                      'event' → no event.
//                                                      All three are one glyph
//                                                      in the catalogue today
//                                                      too (check_circle)
//   PW_01    AC power lost      PowerOff (lucide)      FilterOptionIcon 'power'
//                                                      → ac-lost;
//                                                      SystemHealthCard.jsx:152
//   PW_02    AC power restored  Plug (lucide)          FilterOptionIcon 'power'
//                                                      → default;
//                                                      SystemTypeCard.jsx:88
//   COM_01   system offline     WifiDisconnected02     AlertCard.jsx:1165/1227
//                                                      and SystemHealthCard
//                                                      draw this exact glyph
//                                                      for a system that is off
//   COM_02   system online      Wifi (lucide)          FilterOptionIcon
//                                                      'connectivity';
//                                                      SystemTypeCard
//   SEN_03 / SEN_04  the meter  Gauge (lucide)         SystemTypeCard.jsx:670
//                                                      is the only surface that
//                                                      draws a meter, and it
//                                                      draws Gauge. The two
//                                                      cards share it; the tint
//                                                      and the label carry
//                                                      disconnected vs
//                                                      reconnected
//
// Waves at this size sits inside a filled disc, which is the case this repo
// corrects from the export's 1.08063 stroke to 1.74563 — AlertCard.jsx:232-237
// and EventsTimelineCard.jsx:619. CSS outranks the per-path attribute.
const WAVES_WEIGHT = '[&_path]:[stroke-width:1.74563]';

/** `size`/`className` only; colour comes from the surrounding text colour.
    ValveStatus is drawn a shade larger than the rest: its artwork is a ~9-unit
    ball inside a 12-unit box, so at the lucide size it reads noticeably
    smaller than its neighbours in the same disc. */
function CardGlyph({ cardId, size = 16, className }) {
  const lucide = { size, className, strokeWidth: 1.9 };
  const valve = { size: size + 3, className };
  switch (cardId) {
    case 'WA':       return <Waves size={size} className={cn(className, WAVES_WEIGHT)} />;
    case 'OL':       return <Clock01 size={size} className={className} />;
    case 'SO':
    case 'VC_S_02':
    case 'VC_OK_01': return <ValveStatus state="closed" {...valve} />;
    case 'V_ER':     return <ValveStatus state="error" {...valve} />;
    case 'SEN_01':   return <ValveStatus state="unknown" {...valve} />;
    case 'SEN_02':   return <ValveStatus state="open" {...valve} />;
    case 'PW_01':    return <PowerOff {...lucide} />;
    case 'PW_02':    return <Plug {...lucide} />;
    case 'COM_01':   return <WifiDisconnected02 size={size} className={className} />;
    case 'COM_02':   return <Wifi {...lucide} />;
    case 'SEN_03':
    case 'SEN_04':   return <Gauge {...lucide} />;
    // VC_OK_02, LE_01, V_ER_04 — and the honest default for a catalogue row
    // added later without a line in the table above.
    default:         return <CircleCheck {...lucide} />;
  }
}

// ─── Local controls ─────────────────────────────────────────────────────────

/* src/components/ui/ has no `select`. This is NOT a hand-rolled Select: it is
   the native <select> the panel already used, wearing the same token classes
   as ui/input.jsx so it sits in the same control language. A real popup select
   would be a new primitive, which this port is not the place to introduce. */
function TokenSelect({ className, caretClassName, ...props }) {
  return (
    <div className="relative block min-w-0">
      <select
        className={cn(
          'h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent',
          'py-1 pr-8 pl-3 text-sm font-medium text-foreground shadow-xs outline-none',
          'cursor-pointer transition-[color,box-shadow]',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-input/30',
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground',
          caretClassName,
        )}
      />
    </div>
  );
}

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.5px] leading-4 text-muted-foreground';
const HINT = 'text-[11px] leading-4 italic text-muted-foreground';
const EMPTY = 'text-xs leading-4 italic text-muted-foreground';

// ─── Component ──────────────────────────────────────────────────────────────

export default function ControlPanel({ title = 'Push Simulator' }) {
  const { persona, visibleSystems = [], setPersona } = useUserContext() || {};
  const allPersonas = useMemo(() => [DEFAULT_PERSONA, ...PERSONAS], []);
  // Each pusher generates its own unique ntfy.sh room (persisted in
  // localStorage) so concurrent users don't collide on the default
  // pulse2-demo topic and hit the free-tier rate limit.
  const pairCode = useMemo(() => getOrCreatePusherRoom(), []);

  // Rate-limit banner state.
  const [rateLimited, setRateLimited] = useState(() => isRateLimited());
  const [rateLimitReason, setRateLimitReason] = useState(() => getRateLimitReason());
  useEffect(() => onRateLimitChange((yes, reason) => {
    setRateLimited(yes);
    setRateLimitReason(reason);
  }), []);

  // Per-card state — variant id + params (initialized from defaults).
  const [cardState, setCardState] = useState(() => {
    const init = {};
    for (const card of PUSH_CATALOG) {
      init[card.id] = {
        variant: card.variants?.[0]?.id || card.id,
        params: Object.fromEntries((card.params || []).map(p => [p.key, p.default])),
      };
    }
    return init;
  });

  // Bump to re-derive 'Currently live' after firing.
  const [bump, setBump] = useState(0);
  const triggerRefresh = () => setBump(b => b + 1);
  // eslint-disable-next-line no-unused-vars
  const _bump = bump;
  // Recent fires log (in-component state, not persisted).
  const [recent, setRecent] = useState([]);

  // QR code data URL.
  // Always point at the deployed app's BASE_URL (the mockup root), NOT the
  // current pathname. The pusher is served at /push-panel and /control;
  // the QR target is the mockup itself with ?p=<pairCode> for pairing.
  // Vite's import.meta.env.BASE_URL resolves to '/pulse2_mobile_product_mockup_v2/'
  // in prod and '/' in dev — both correct.
  //
  // The two colours below are NOT untokenised debt. qrcode rasterises to a PNG
  // data URL, so a CSS custom property cannot reach it; and a QR has to stay
  // dark-on-light at a high ratio in every theme or phone cameras stop reading
  // it. Same reasoning for the white quiet zone on the frame in the markup.
  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?p=${encodeURIComponent(pairCode)}`;
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#14151A', light: '#fff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [pairCode]);

  // Stateless store - every read hits localStorage.
  const sims = getSimulatedAlerts();

  // ─── Per-section target system ──────────────────────────────────────────
  // All cards in a section target the SAME system, picked from a dropdown at
  // the top of the section. Storytelling: fire Warning -> Ongoing -> Shutoff
  // -> Event ended all on the same system. The Valve section additionally
  // filters to systems that have a valve installed.

  function sectionEligibleSystems(sectionName) {
    if (sectionName === 'Valve') return visibleSystems.filter(s => s.valve != null);
    return visibleSystems;
  }

  const [sectionSystemId, setSectionSystemId] = useState({});

  // Derive an effective system id per section: explicit pick if set, else
  // first eligible. Re-derives when persona changes (visibleSystems changes).
  const effectiveSectionSystem = useMemo(() => {
    const out = {};
    for (const section of PUSH_SECTIONS) {
      const eligible = sectionEligibleSystems(section.name);
      const explicit = sectionSystemId[section.name];
      const pick = (explicit && eligible.find(s => s.id === explicit)) || eligible[0] || null;
      out[section.name] = pick;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSystems, sectionSystemId]);

  // ─── Fire logic ──────────────────────────────────────────────────────────
  //
  // Single source of truth: applyPushEvent (src/lib/pushEvents.js) is the
  // ONLY thing that writes to localStorage in response to a push. The sender
  // calls it locally for its own UI then broadcasts the same payload over
  // BroadcastChannel + ntfy.sh. Receivers (PushNotifications.jsx) call the
  // same function on incoming events. No drift, ever.

  function publish(event) {
    // Local apply for the sender's own tab (drives 'Currently live' here).
    applyPushEvent(event);
    // Same-browser other tabs:
    channel.postMessage(event);
    // Cross-device:
    bridgePublish(event, pairCode);
  }

  function fireCard(card) {
    const sys = effectiveSectionSystem[card.section];
    if (!sys) return;
    const st = cardState[card.id];
    const variantId = st.variant;
    const paramValues = st.params || {};
    const siteName = sys.l4Name || sys.l3Name || sys.l2Name || '';
    const { title: t, body, action } = buildPushText(card, variantId, sys, paramValues, { persona });
    const { type, state, severity } = payloadMeta(card, variantId);

    const payload = {
      type, state, severity,
      v10_9_id: variantId,
      systemId: sys.id,
      systemName: sys.name,
      site: siteName,
      title: t,
      body,
      action,
      icon: card.glyph,
      flowRate: paramValues.flowRate,
      volume:   paramValues.volume,
      duration: paramValues.duration,
      timestamp: new Date().toISOString(),
    };

    publish({ type: 'push', payload });
    // Bump UI listeners that don't subscribe to storage events directly.
    publish({ type: 'data-changed' });

    setRecent(prev => [
      { ts: nowHHMM(), cardId: card.id, variantId, systemName: sys.name, label: card.label },
      ...prev,
    ].slice(0, 8));
    triggerRefresh();
  }

  function clearOne(systemId) {
    // Publish a synthetic 'online' push for this system - it goes through
    // applyPushEvent which clears the sim alert. One code path for clears.
    publish({ type: 'push', payload: { type: 'online', systemId } });
    publish({ type: 'data-changed' });
    triggerRefresh();
  }

  function clearAll() {
    // Local + cross-device demo reset. applyDemoReset locally wipes our
    // stores; broadcasting demo-reset makes paired phones do the same.
    applyDemoReset();
    channel.postMessage({ type: 'demo-reset' });
    bridgePublish({ type: 'demo-reset' }, pairCode);
    publish({ type: 'data-changed' });
    triggerRefresh();
  }

  const livIds = Object.keys(sims);
  const currentPersona = persona || DEFAULT_PERSONA;
  const pairUrl = `${window.location.origin}${window.location.pathname.replace(/\/push$/, '/')}?p=${pairCode}`;

  return (
    <div className="min-h-screen bg-background px-7 pt-6 pb-20 text-foreground">
      <div className="mx-auto max-w-[1180px]">

        {/* Rate-limit banner - shown when ntfy.sh returned 429 (free-tier
            daily quota reached). Sticky until a successful publish goes
            through (which clears the flag automatically).

            This is now the ONLY place the throttle diagnostic appears: the
            orange "BRIDGE THROTTLED" chip that used to float over every app
            screen in PushNotifications.jsx was removed - the owner ruled it
            belongs with the pusher, not on the product surface. Hence
            position: sticky - the pusher is scrolled down among the push
            cards when a publish 429s, and a banner parked at the top of a
            long page would never be seen.

            ui/ has no `alert` primitive, so this is a plain element wearing
            the repo's --alert-*-warning triple rather than an invented
            lookalike of one. --alert-surface-warning is opaque, which is what
            a sticky banner needs: the old build layered a translucent amber
            over a hardcoded #E8ECF0 to fake that. */}
        {rateLimited && (
          <div
            role="status"
            className="sticky top-0 z-20 mb-3.5 flex items-start gap-2.5 rounded-xl border border-alert-border-warning bg-alert-surface-warning px-4 py-3 text-sm leading-5 text-alert-ink-warning"
          >
            <Warning size={20} className="mt-px shrink-0" />
            <div className="text-foreground">
              <div className="mb-1 font-semibold leading-5 text-alert-ink-warning">Cross-device push relay throttled</div>
              <div>{rateLimitReason || 'ntfy.sh free-tier daily message quota reached. Pushes will not reach paired phones until ~midnight UTC.'}</div>
              <div className="mt-1.5 text-muted-foreground">
                <b className="font-semibold">Workaround:</b> open the app in another tab on this same laptop (instead of a paired phone). Same-browser push delivery uses BroadcastChannel and isn&apos;t affected by the ntfy limit.
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-xl leading-7 font-semibold tracking-[-0.4px]">{title}</h1>
            <span className="text-sm leading-5 text-muted-foreground">Fire any push notification into a paired phone</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Wipes all simulator state AND hides the pre-populated mock alerts / incidents / history, so every system reads as clean. New pushes still work on top."
          >
            <Trash2 />Clear all — fleet starts clean
          </Button>
        </div>

        {/* Top row: numbered testing flow - step 1 (pair phone) then step 2 (pick profile) */}
        <div className="mb-4 grid gap-3.5 lg:grid-cols-[1.3fr_1fr]">

          {/* STEP 1 - Pairing card (left, bigger) */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Badge className="size-[22px] shrink-0 justify-center p-0 text-xs font-semibold">1</Badge>
              <CardTitle className={EYEBROW}>Pair your phone</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-[auto_1fr] items-center gap-3.5">
              {/* The quiet zone is white in every theme on purpose — see the
                  note on the QR effect above. */}
              <div className="flex size-[110px] shrink-0 items-center justify-center rounded-md border border-border bg-[#ffffff] p-1.5">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Pairing QR" className="size-full" />
                ) : (
                  <span className="text-[10px] leading-4 text-muted-foreground">generating QR…</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 inline-block rounded-md bg-foreground px-3 py-1.5 font-mono-label text-lg leading-6 font-semibold tracking-[1.5px] tabular-nums text-background">
                  {pairCode}
                </div>
                <a
                  href={pairUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 block font-mono-label text-[11px] leading-4 break-all text-primary underline"
                  title="Open the paired phone view in a new tab"
                >
                  {pairUrl.replace(/^https?:\/\//, '')}
                </a>
                <Badge
                  variant="outline"
                  className="gap-1.5 rounded-md border-alert-border-success bg-alert-surface-success px-2.5 py-1 text-[11.5px] font-medium text-alert-ink-success"
                >
                  <span className="size-2 rounded-full bg-success" aria-hidden="true" />Channel ready
                </Badge>
              </div>
            </CardContent>
            <Separator className="mt-1" />
            <CardContent>
              <div className={HINT}>Scan with your phone camera to receive pushes from this pusher.</div>
            </CardContent>
          </Card>

          {/* STEP 2 - Push as (right) */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Badge className="size-[22px] shrink-0 justify-center p-0 text-xs font-semibold">2</Badge>
              <CardTitle className={EYEBROW}>Choose the profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {/* `bg` and `color` are the persona's own identity mark, carried
                    in src/data/personas.js alongside its emoji. They are data,
                    not theme — the same category as the catalogue's `tint`. */}
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm leading-5 font-semibold"
                  style={{
                    background: currentPersona.bg || 'var(--muted)',
                    color: currentPersona.color || 'var(--foreground)',
                    borderColor: `${currentPersona.color || 'var(--border)'}40`,
                  }}
                >
                  {currentPersona.icon || initials(currentPersona.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <TokenSelect
                    value={currentPersona.id}
                    onChange={(e) => {
                      const p = allPersonas.find(x => x.id === e.target.value);
                      if (p && setPersona) setPersona(p);
                    }}
                  >
                    {allPersonas.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.role}</option>
                    ))}
                  </TokenSelect>
                </div>
              </div>
              <div className="mt-2 text-xs leading-4 text-muted-foreground">
                <strong className="font-semibold text-foreground">{visibleSystems.length} system{visibleSystems.length === 1 ? '' : 's'}</strong> in scope
              </div>
              <div className={cn(HINT, 'mt-2')}>Pick the same profile on your paired phone so identity matches here and there.</div>
            </CardContent>
          </Card>
        </div>

        {/* Push card sections */}
        {PUSH_SECTIONS.map(section => {
          const eligible = sectionEligibleSystems(section.name);
          const sectSys = effectiveSectionSystem[section.name];
          return (
          <div key={section.name}>
            <div className="mt-5 mb-2.5 flex flex-wrap items-center gap-2">
              <div className="text-sm leading-5 font-semibold">{section.name}</div>
              <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] font-medium uppercase tracking-[0.5px] text-muted-foreground">
                {section.cards.length} card{section.cards.length === 1 ? '' : 's'}
              </Badge>
              {/* Section system picker — all cards in this section fire on this system */}
              {eligible.length > 0 ? (
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[11px] leading-4 font-medium text-muted-foreground">on</span>
                  <TokenSelect
                    value={sectSys?.id || ''}
                    onChange={(e) => setSectionSystemId(prev => ({ ...prev, [section.name]: e.target.value }))}
                    className="h-8 w-[260px] max-w-[260px] pr-7 pl-2.5 text-xs"
                    caretClassName="size-3.5 right-2"
                  >
                    {eligible.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.l4Name ? `· ${s.l4Name}` : ''}
                      </option>
                    ))}
                  </TokenSelect>
                </div>
              ) : (
                <span className={cn(EMPTY, 'ml-auto')}>No eligible system in scope</span>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
              {section.cards.map(card => {
                const sys = sectSys;
                const disabled = !sys;
                const st = cardState[card.id];
                return (
                  /* `tint` is the catalogue's own value and pushCatalog.js:10-19
                     says in so many words that the four raw ones are deliberate
                     and must not be rounded to the nearest token. It is read
                     here as data, exactly as PushSimSheet reads it for its dot.
                     The disc wash is color-mix rather than the old `tint + '1A'`
                     string concat, which silently produced `var(--success)1A`
                     and painted nothing for the four tokenised rows. */
                  <Card
                    key={card.id}
                    className={cn(
                      'min-w-0 gap-2 overflow-hidden rounded-xl border-l-4 py-3',
                      disabled && 'opacity-55',
                    )}
                    style={{ borderLeftColor: card.tint }}
                  >
                    <CardContent className="flex min-w-0 flex-col gap-2 px-3">
                      <div className="flex items-start gap-2">
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-[7px]"
                          style={{
                            background: `color-mix(in oklab, ${card.tint} 14%, transparent)`,
                            color: card.tint,
                          }}
                          aria-hidden="true"
                        >
                          <CardGlyph cardId={card.id} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] leading-4 font-medium tracking-[0.5px] text-muted-foreground">{card.id}</div>
                          <div className="text-[13px] leading-[17px] font-semibold text-foreground">{card.label}</div>
                        </div>
                      </div>

                      {sys ? (
                        <div className="text-xs leading-4 text-slate-600">
                          <strong className="font-semibold text-foreground">{sys.name}</strong><br />
                          <span className="text-[11px] leading-4 text-muted-foreground">{sys.l4Name || sys.l3Name || ''}</span>
                        </div>
                      ) : (
                        <div className={EMPTY}>No eligible system in this persona&apos;s scope.</div>
                      )}

                      {(card.variants || card.params) && (
                        <div className="flex min-w-0 flex-col gap-1.5 rounded-md bg-muted px-2.5 py-2">
                          {card.variants && (
                            <div className="flex min-w-0 items-center justify-between gap-2">
                              <div className="shrink-0 text-[11px] leading-4 font-medium text-muted-foreground">Variant</div>
                              <div className="min-w-0 flex-1">
                                <TokenSelect
                                  value={st.variant}
                                  onChange={(e) => setCardState(prev => ({ ...prev, [card.id]: { ...prev[card.id], variant: e.target.value } }))}
                                  className="h-7 bg-card pr-7 pl-2 text-[11px]"
                                  caretClassName="size-3.5 right-2"
                                >
                                  {card.variants.map(v => (
                                    <option key={v.id} value={v.id}>{v.label}</option>
                                  ))}
                                </TokenSelect>
                              </div>
                            </div>
                          )}
                          {(card.params || []).map(p => (
                            <div key={p.key} className="flex min-w-0 items-center justify-between gap-2">
                              <div className="shrink-0 text-[11px] leading-4 font-medium text-muted-foreground">{p.label}</div>
                              <Input
                                value={st.params?.[p.key] || ''}
                                onChange={(e) => setCardState(prev => ({
                                  ...prev,
                                  [card.id]: { ...prev[card.id], params: { ...prev[card.id].params, [p.key]: e.target.value } },
                                }))}
                                className="h-7 w-[100px] shrink-0 bg-card px-2 py-0 text-right font-mono-label text-[11.5px] font-medium tabular-nums md:text-[11.5px]"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* One button language. The per-card tint lives on the
                          left rule and the glyph disc; seventeen bespoke button
                          fills were the loudest thing on the page and the
                          clearest sign the screen predated the design system. */}
                      <Button
                        size="sm"
                        className="mt-0.5 w-full"
                        disabled={disabled}
                        onClick={() => fireCard(card)}
                      >
                        <Play />Fire
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          );
        })}

        {/* Currently live + Recent */}
        <div className="mt-6 grid gap-3.5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className={cn(EYEBROW, 'flex items-center gap-1.5')}>
                <Activity className="size-4 text-success" aria-hidden="true" />Currently live ({livIds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {livIds.length === 0 ? (
                <div className={EMPTY}>No simulated alerts persisted. Fire one above.</div>
              ) : (
                <Table>
                  <TableBody>
                    {livIds.map(id => {
                      const sys = SYSTEMS.find(x => x.id === id);
                      const a = sims[id];
                      const inScope = visibleSystems.some(x => x.id === id);
                      return (
                        <TableRow key={id}>
                          <TableCell className="px-0 text-xs leading-4 whitespace-normal text-foreground">
                            <strong className="font-semibold">{sys?.name || id}</strong> · {a.type}{a.flowRate ? ` · ${a.flowRate}` : ''}{a.startedAt ? ` · @${a.startedAt}` : ''}
                            {!inScope && (
                              <Badge
                                variant="outline"
                                className="ml-1.5 rounded-md border-alert-border-warning bg-alert-surface-warning px-1.5 py-0 text-[10px] font-medium tracking-[0.5px] text-alert-ink-warning"
                              >
                                OUT OF SCOPE
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="w-px px-0 text-right">
                            <Button variant="outline" size="xs" onClick={() => clearOne(id)}>
                              <Trash2 />Clear
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={cn(EYEBROW, 'flex items-center gap-1.5')}>
                <History className="size-4 text-muted-foreground" aria-hidden="true" />Recent fires (last {recent.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <div className={EMPTY}>Nothing fired yet this session.</div>
              ) : (
                <Table>
                  <TableBody>
                    {recent.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="w-11 px-0 font-mono-label text-[11px] leading-4 tabular-nums text-muted-foreground">{r.ts}</TableCell>
                        <TableCell className="px-0 text-xs leading-4 whitespace-normal text-foreground">
                          {r.variantId} → <strong className="font-semibold">{r.systemName}</strong>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
