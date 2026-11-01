// Push notification system — simulates Android/iOS notifications
// Lock screen: glance only, no action buttons (per agreed taxonomy).
// Shade: pulled-down notification tray with actions.
// Other-app heads-up: card with inline actions.
// In-app banner: top banner with actions.
//
// Action taxonomy by leak state:
//   Warning      → View · I'm on it · Ignore
//   Ongoing      → View · Dismiss
//   Shutoff (SO) → View · I'm on it
//   End of Leak  → Tag what it was · Dismiss
//
// Resolved-state reflection: investigating/ignored/tagged status is read from
// the same persistence stores LeakDetail uses — so an action taken on one
// surface (notification, alert detail) is reflected on the others.
//
// ─── A NOTE ON THE STYLING, BECAUSE IT DELIBERATELY BREAKS THE PATTERN ──────
//
// This is a v1 module, but v2 mounts it: App.jsx wraps every v2 route in it.
// docs/TOKENIZATION-PLAN.md scopes its phases to src/v2/ + src/components/ui/
// and names only TabBar.jsx and Phone.jsx as the v1 modules v2 mounts, so this
// file was never migrated and still carried 83 inline style objects, 42
// distinct raw colours and zero tokens. It is ported now, on the plan's own
// terms (":598 — if a v1 screen is being ported, its theme debt is part of
// that port's cost").
//
// The port is to Tailwind utilities on the repo's tokens, with ONE standing
// exception that is the whole design of these surfaces:
//
//   THREE OF THE FOUR SURFACES IMITATE THE OPERATING SYSTEM, NOT THE APP.
//
// A lock screen, a notification shade and an other-app heads-up are phone
// chrome. If they adopt the app's card surface, the app's tinted avatar and
// the app's radius, they stop reading as notifications and start reading as an
// AlertCard that escaped its list. So the dark wallpaper, the white-alpha
// glass, the solid-fill category circle, the tighter insets, the larger OS
// radius, the heavier float and the oversized lock clock are all PRESERVED —
// but each one is expressed through a token (the --os-* family in index.css)
// rather than a literal, so a theme can still move them. Only the in-app
// banner is a Wint surface, and it takes house tokens throughout.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, CircleAlert, LockOpen, Plug, PowerOff, Unlink, Wifi, WifiOff } from 'lucide-react';
import { isInvestigating, getInvestigatingInfo, startInvestigating } from '../data/investigatingStore';
import { isIgnored, getIgnoredInfo } from '../data/ignoredIncidents';
import { hasTagFeedback } from '../data/eventFeedbackStore';
import { getCurrentActor, setCurrentActor } from '../data/currentUser';
import { subscribe as bridgeSubscribe, publish as bridgePublish } from '../lib/pushBridge';
import { applyPushEvent, applyDemoReset } from '../lib/pushEvents';
import { useUserContext } from '../context/UserContext';
import { SYSTEMS } from '../data/systems';
import { CloseFill, Droplets, Warning, Waves } from '../v2/icons';
import { cn } from '../lib/utils';

// Build the payload the desktop /push-panel uses to scope its system picker
// to whatever persona the phone is currently logged in as.
//
// We CAP visibleSystemIds at 60 ids and signal truncation with `truncated:
// true`. The bridge is on ntfy.sh free tier (4KB per message, ~5 messages
// per hour per sender). A persona with 200 systems (Oren Tidhar) would
// blow past the size limit AND eat the hourly quota on just the persona
// handshake, leaving no budget for actual pushes. The pusher only needs
// enough ids to pick a system from a section dropdown.
function buildPhonePersonaEvent(persona) {
  if (!persona) return null;
  const allIds = SYSTEMS.filter(s => persona.systemFilter(s)).map(s => s.id);
  const MAX_IDS = 60;
  const ids = allIds.slice(0, MAX_IDS);
  return {
    type: 'phone-persona',
    payload: {
      persona: { id: persona.id, name: persona.name, role: persona.role },
      visibleSystemIds: ids,
      truncated: allIds.length > MAX_IDS,
      totalSystemCount: allIds.length,
      actor: getCurrentActor(),
    },
  };
}

// Throttle phone-persona broadcasts so we don't hammer ntfy.sh's rate
// limit (5 msgs/hour per sender on the free tier). Many React effects
// + bridge reconnects can fire phone-persona repeatedly otherwise.
let _lastPhonePersonaSig = '';
let _lastPhonePersonaTs = 0;
function publishPhonePersonaIfChanged(ev, publishFn) {
  if (!ev) return;
  // Compact signature: persona id + count is enough to detect actual change.
  const sig = `${ev.payload.persona.id}:${ev.payload.totalSystemCount}:${ev.payload.actor || ''}`;
  const now = Date.now();
  // Skip if same signature within 30 seconds (covers double-mount + onOpen
  // reconnect-storm scenarios).
  if (sig === _lastPhonePersonaSig && (now - _lastPhonePersonaTs) < 30_000) return;
  _lastPhonePersonaSig = sig;
  _lastPhonePersonaTs = now;
  publishFn(ev);
}

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null;
// Second instance, used by the bridge subscriber to deliver events into the
// local listener. A BroadcastChannel doesn't receive messages it sends itself,
// so posting from `channel` would no-op; posting from a sibling instance does.
const relayChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulse2-push') : null;
const BASE = import.meta.env.BASE_URL;

// All push-event state mutation is delegated to applyPushEvent in
// src/lib/pushEvents.js - the single source of truth for what each push does
// to localStorage. This wrapper just routes meta events (actor-changed,
// demo-reset) and forwards everything else to applyPushEvent.
function applyDataLayerSideEffects(event) {
  if (!event) return;
  if (event.type === 'actor-changed' && event.actor) {
    setCurrentActor(event.actor);
    return;
  }
  if (event.type === 'demo-reset') {
    applyDemoReset();
    return;
  }
  applyPushEvent(event);
}

// ─── The shared spacing / type scale ────────────────────────────────────────
//
// The port collapsed six ad-hoc padding strings and three gap values into this
// named set. Two of the four entries are smaller than their app equivalents on
// purpose: an OS notification is denser than a card in a list, and its stack
// is tighter than a card list's. That density is one of the things that makes
// the surface read as system chrome, so it is preserved — named, not scattered.
const OS_CARD_INSET = 'px-[14px] py-[12px]';   // tighter than the app's card inset
const APP_CARD_INSET = 'px-[12px] py-[10px]';  // the in-app banner, a Wint surface
const CARD_STACK_GAP = 'mb-[8px]';             // tighter than a card list's stack
const TITLE_GAP = 'gap-[10px]';                // already matches the app's title gap
const HEADER_GAP = 'gap-[8px]';

// Status pills ("On it · Dana", "Ignored"). borderRadius: 4 was the loudest
// "different app" tell in the file after the typeface — the house badge is
// rounded-full / rounded-[26px], never a 4px rectangle.
const PILL = 'shrink-0 rounded-full px-[7px] py-[2px] text-[11px] leading-[14px] font-medium';

// Tailwind v4 scans for LITERAL class strings, so none of these can be built
// by interpolation (`bg-${accent}` compiles to nothing at all, silently).
// Every class a surface can take is spelled out once, here.
const ACCENT = {
  'primary':       { solid: 'bg-primary',       onSolid: 'text-primary-foreground',       wash: 'bg-primary/8',       ink: 'text-primary' },
  'severity-high': { solid: 'bg-severity-high', onSolid: 'text-severity-high-foreground', wash: 'bg-severity-high/8', ink: 'text-severity-high' },
  'severity-low':  { solid: 'bg-severity-low',  onSolid: 'text-severity-low-foreground',  wash: 'bg-severity-low/8',  ink: 'text-severity-low' },
};

// ─── Per-state action map ───────────────────────────────────────────────────

// Action set per notification state - see src/utils/notificationActions.js
// (extracted so it can be unit-tested directly).
import { buildActions } from '../utils/notificationActions';

// ─── Action button strip ────────────────────────────────────────────────────

function NotifActions({ notification: n, onAction, dark = false }) {
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const ignored = sysId ? isIgnored(sysId) : false;
  // The Tag CTA opens WaterEventFeedbackSheet (?action=tag -> SystemPageV2Screen),
  // which persists to eventFeedbackStore under its own namespaced key — not to
  // tagsStore, and not under the bare system id the ignore flow uses. Reading
  // anything else here leaves the push offering "Tag the cause" forever.
  const tagged = sysId ? hasTagFeedback(sysId) : false;

  // BUG FIX: this read n.severity without first asking whether the event IS a
  // water event, so EVERY non-leak push — valve error, power lost, sensor
  // offline — fell through to the Low-Flow orange and drew an orange primary
  // button. The four card components (LockCard, ShadeCard, InAppBanner,
  // HeadsUpNotification) all guarded with isLeak; only this one did not.
  const isLeak = n.type === 'leak';
  const accent = ACCENT[!isLeak
    ? 'primary'
    : n.severity === 'High Flow' ? 'severity-high' : 'severity-low'];

  const actions = buildActions(n, { investigating, ignored, tagged });
  if (actions.length === 0) return null;

  // The Tag CTA on the Water Event ended push (PRD 15 § 7.1) gets a special
  // Wint accent blue treatment - brand-consistent and reads as inviting
  // rather than alarming. Other primary actions use the severity color.
  //
  // #036AB5, the gradient's dark stop, has no token and does not get one minted
  // for it: it is --primary walked 28% toward black, so that is how it is
  // written. A theme moving --primary moves both stops together.
  const TAG_GRADIENT =
    'bg-[linear-gradient(135deg,var(--primary)_0%,color-mix(in_oklab,var(--primary),black_28%)_100%)]';

  if (dark) {
    return (
      <div className="mt-[8px] flex flex-wrap gap-[6px]">
        {actions.map(a => (
          <div key={a.key}
            onClick={(e) => { e.stopPropagation(); onAction(a.key, n); }}
            className={cn(
              'min-w-[80px] flex-[1_1_0] cursor-pointer rounded-md px-[6px] text-center font-medium',
              a.tagCta ? 'py-[11px] text-[13px] leading-[18px]' : 'py-[8px] text-[12px] leading-[16px]',
              // The glass button ground is the chrome ink at 12%, same family
              // as every other frosted fill on these two surfaces.
              a.tagCta ? TAG_GRADIENT : a.primary ? accent.solid : 'bg-os-chrome-ink/12',
              a.tagCta
                ? 'text-ink-on-color [box-shadow:0_4px_10px_color-mix(in_oklab,var(--primary)_30%,transparent)]'
                : a.primary ? accent.onSolid
                : a.done ? 'text-os-chrome-ink/60' : 'text-os-chrome-ink',
            )}>{a.label}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('mt-[8px] flex flex-wrap', HEADER_GAP)}>
      {actions.map(a => (
        <span key={a.key}
          onClick={(e) => { e.stopPropagation(); onAction(a.key, n); }}
          className={cn(
            'cursor-pointer text-[13px] leading-[18px] font-medium',
            a.tagCta
              ? cn('rounded-md px-[14px] py-[8px] text-ink-on-color', TAG_GRADIENT,
                   // ${tagBlue}33 — string-concatenated hex alpha, which cannot
                   // take a var(). 0x33/0xff = 20%.
                   '[box-shadow:0_3px_8px_color-mix(in_oklab,var(--primary)_20%,transparent)]')
              : cn('rounded-md px-[8px] py-[4px]',
                   // ${accentColor}14 — the same hex-alpha problem. 0x14/0xff ≈ 8%.
                   a.primary ? cn(accent.wash, accent.ink)
                   : a.done ? 'text-success' : 'text-muted-foreground'),
          )}>{a.label}</span>
      ))}
    </div>
  );
}

// ─── Category icon — timeline-style 24×24 colored circle + glyph ────────────
//
// Same visual pattern as Event Timeline rows in EventRow: a 24×24 circle, a
// glyph in the circle's own foreground token, colour per category. Keeps the
// app reading as one design language.
//
// THE CIRCLE IS A SOLID FILL, NOT THE APP'S TINTED AVATAR. On the lock and
// shade surfaces a 12%-tint avatar over dark glass is illegible; the solid
// disc is the only version that survives both grounds, so it is used on all
// four surfaces rather than branching.
//
// The glyphs were Material Symbols. src/v2 contains zero uses of that font —
// these two surfaces were the only v2-reachable thing still loading it — so
// they are now src/v2/icons + lucide, which is what the rest of v2 draws with.
//
// The title text still arrives WITH the V11 emoji prefix (so the catalogue
// source-of-truth is unchanged); we strip the emoji at render time and
// substitute the circle.

const LEADING_EMOJI_REGEX = /^[💧⚠⚡📵]\s+/u;

function stripLeadingEmoji(title) {
  if (!title) return title;
  return title.replace(LEADING_EMOJI_REGEX, '');
}

function getNotificationCategory(n) {
  const sev = n?.severity;
  const variantId = n?.v10_9_id || n?.variantId || '';
  const severeShutoff = /^SO_(04|06|07|08|09)$/.test(variantId);
  const severeValveErr = /^V_ER_(01|02|03|05)$/.test(variantId);

  // Water event family (leak). Severe shutoff variants get the warning
  // triangle instead of the waves, mirroring V11's ⚠ vs 💧 distinction.
  //
  // BUG FIX: this drew `Droplets`, and that was the complaint. A water event
  // is `Waves` EVERYWHERE ELSE in this app — AlertCard, EventsTimelineCard,
  // TriageBand, ActiveWaterEventsCard, SystemPage, HomeAccountOverview — and
  // FilterOptionIcon.jsx, the canonical filter-value → glyph table, says so in
  // its own provenance note: "water events  Waves, which carries Wint's leak
  // meaning across the app." `Droplets` is NOT a spare leak glyph: InsightsCard
  // uses it as the FLAT entry of its consumption-trend triple (DropletDown /
  // DropletShare / Droplets), so the push was borrowing a glyph that means
  // "consumption is steady" to announce a leak. Fired in-app, the banner drew
  // a droplet directly above the home screen's own Water events row drawing
  // waves — the same event, two glyphs, one screen.
  if (n?.type === 'leak' || /^(WA|OL|SO|LE)_/.test(variantId)) {
    const tone = sev === 'Low Flow' ? 'severity-low' : 'severity-high';
    return severeShutoff
      ? { Icon: Warning, tone }
      : { Icon: Waves, tone, glyphClass: WAVES_WEIGHT };
  }
  // Valve errors.
  //
  // BUG FIX: the non-severe branch drew Material's `check_circle` — a success
  // tick — on the --danger ground. A green-semantics glyph on a red disc is
  // the wrong signal twice over. It is CircleAlert now; the severe branch
  // keeps the triangle, so the two tiers still read apart.
  if (n?.type === 'valve-error' || /^V_ER_/.test(variantId)) {
    return { Icon: severeValveErr ? Warning : CircleAlert, tone: 'danger' };
  }
  // Sensors (valve/meter dis/reconnect).
  //
  // BUG FIX: this branch tested `severeSensor`, which was defined as exactly
  // the condition that gets you INTO the branch — so the ternary was always
  // true and the `link_off` arm was unreachable dead code. The header comment
  // above said sensors draw link_off, and the code could never do it. The
  // unreachable constant is gone and the branch now draws the disconnect
  // glyph it always meant to. Which of SEN_01 / SEN_03 was supposed to be
  // "severe" is not recoverable from the source; both are disconnects and
  // both read as one.
  if (variantId === 'SEN_01' || variantId === 'SEN_03') {
    return { Icon: Unlink, tone: 'slate-500' };
  }
  if (variantId === 'SEN_02') return { Icon: Plug,     tone: 'success' };
  if (variantId === 'SEN_04') return { Icon: Droplets, tone: 'success' };
  // Power.
  //
  // #B5651A (power-lost) has no right token in this system and one is NOT
  // minted here. --severity-low is the nearest ground, but its comment pins it
  // to "Low Flow Water Event" and a power cut is not a water event. The
  // closest honest fit is the warning tier that is not water-specific:
  // --alert-ink-warning as a solid ground. FLAGGED FOR THE OWNER — if power
  // events deserve their own semantic colour, this is where it goes.
  if (n?.type === 'power-lost')     return { Icon: PowerOff, tone: 'alert-ink-warning' };
  if (n?.type === 'power-restored') return { Icon: Plug,     tone: 'success' };
  // Communication
  if (n?.type === 'offline') return { Icon: WifiOff, tone: 'slate-500' };
  if (n?.type === 'online')  return { Icon: Wifi,    tone: 'success' };
  // Fallback - matches the old default banner accent
  return { Icon: CircleAlert, tone: 'primary' };
}

// Ground → ink. The four severity grounds have a *-foreground partner that
// flips with them per theme, which is exactly what ink on a coloured chip
// needs. --slate-500 and --alert-ink-warning have no partner, so they take
// --ink-on-color: the token that exists for "near-white ink on a ground that
// stays coloured under every theme".
// Literal strings only — see the note on ACCENT above.

// src/v2/icons/Waves exports into a 21-unit box at stroke 1.08063, which is
// too thin wherever the glyph is drawn small inside a filled disc. AlertCard
// (:232-237) and EventsTimelineCard (:619) both correct it to 1.74563 via CSS,
// which outranks the per-path stroke-width attribute. Same glyph, same disc,
// same correction — stated here rather than invented.
const WAVES_WEIGHT = '[&_path]:[stroke-width:1.74563]';

const TONE = {
  'severity-high':     'bg-severity-high text-severity-high-foreground',
  'severity-low':      'bg-severity-low text-severity-low-foreground',
  'danger':            'bg-danger text-danger-foreground',
  'success':           'bg-success text-success-foreground',
  'primary':           'bg-primary text-primary-foreground',
  'slate-500':         'bg-slate-500 text-ink-on-color',
  'alert-ink-warning': 'bg-alert-ink-warning text-ink-on-color',
};

function CategoryCircle({ notification, size = 24, glyphSize = 14 }) {
  const { Icon, tone, glyphClass } = getNotificationCategory(notification);
  return (
    <div
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', TONE[tone])}
      style={{ width: size, height: size }}>
      <Icon size={glyphSize} className={glyphClass} />
    </div>
  );
}

// ─── The glass surfaces' shared header row ──────────────────────────────────
//
// NOTE FOR THE OWNER, NOT A BUG: all four surfaces draw the ANDROID header
// anatomy — app mark + "Wint" + timestamp. On iOS the system supplies the app
// icon and the HIG says outright "Avoid including your app name or icon", so
// the two platforms want different rows here. That is a design question, not a
// tokenisation one, and it is left exactly as it was.

function StatusPills({ investigating, ignored, investigatingInfo, ignoredInfo, dark }) {
  return (
    <>
      {investigating && (
        <span className={cn(PILL, dark
          // MEASURED, not assumed. The app's own pair
          // (--alert-surface-success + --alert-ink-success) is a direct swap on
          // the light surfaces, but on the dark glass it measures 3.01:1
          // ink-on-chip at 11px AND throws a 10-13:1 near-white chip onto the
          // wallpaper — an app chip pasted onto OS chrome, which is the one
          // thing these surfaces must not do. The glass idiom instead: the
          // semantic hue as a 22% tint, the chrome ink as the label. 8.45:1 on
          // the lock card, 10.74:1 on the shade — better than the 4.31/5.50
          // the raw #A1D246 it replaces was getting.
          ? 'bg-[color-mix(in_oklab,var(--success)_22%,transparent)] text-os-chrome-ink'
          : 'bg-alert-surface-success text-alert-ink-success')}>
          On it{investigatingInfo?.actor ? ` · ${investigatingInfo.actor}` : ''}
        </span>
      )}
      {ignored && (
        <span className={cn(PILL, dark
          ? 'bg-[color-mix(in_oklab,var(--alert-ink-warning)_22%,transparent)] text-os-chrome-ink'
          : 'bg-alert-surface-warning text-alert-ink-warning')}>
          Ignored{ignoredInfo?.ignoredBy ? ` · ${ignoredInfo.ignoredBy}` : ''}
        </span>
      )}
    </>
  );
}

function WintMark({ size = 22, dark }) {
  return (
    <img src={`${BASE}wint-logo.svg`} alt=""
      className={cn('shrink-0 rounded-[6px] p-[2px]', dark ? 'bg-card' : 'bg-accent')}
      style={{ width: size, height: size }} />
  );
}

// ─── Lock screen card (glance only — no action buttons) ─────────────────────

function LockCard({ notification: n, expanded, onToggleExpand }) {
  const isLeak = n.type === 'leak';
  const timeStr = new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const investigatingInfo = sysId ? getInvestigatingInfo(sysId) : null;
  const ignored = sysId ? isIgnored(sysId) : false;
  const ignoredInfo = sysId ? getIgnoredInfo(sysId) : null;

  return (
    // Frosted glass: the chrome ink at 12% over the wallpaper, hairline at 8%.
    // One token (--os-chrome-ink) is the source of both, so a theme moving the
    // ink moves the whole glass family with it.
    <div className={cn(
      'overflow-hidden rounded-os-notification border border-solid border-os-chrome-ink/8 bg-os-chrome-ink/12 backdrop-blur-[16px]',
      CARD_STACK_GAP,
    )}>
      {/* Top accent bar removed (Option A) - category circle carries severity. */}
      <div onClick={onToggleExpand} className={cn('cursor-pointer', OS_CARD_INSET)}>
        <div className={cn('mb-[6px] flex items-center', HEADER_GAP)}>
          <WintMark dark />
          <span className="text-[13px] leading-[18px] font-semibold text-os-chrome-ink">Wint</span>
          <StatusPills dark {...{ investigating, ignored, investigatingInfo, ignoredInfo }} />
          <span className="ml-auto text-[11px] leading-[16px] text-os-chrome-ink/55">{timeStr}</span>
        </div>
        <div className={cn('flex items-start', TITLE_GAP)}>
          <CategoryCircle notification={n} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] leading-[18px] font-semibold text-os-chrome-ink/90">{stripLeadingEmoji(n.title)}</div>
            {!expanded && <div className="mt-[3px] truncate text-[13px] leading-[18px] text-os-chrome-ink/70">{n.body}</div>}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-[14px] pb-[12px]">
          <div className="mb-[6px] text-[14px] leading-[20px] text-os-chrome-ink/80">{n.body}</div>
          {isLeak && (n.flowRate || n.volume || n.duration) && (
            <div className="flex gap-[6px]">
              {[['Flow rate', n.flowRate], ['Volume', n.volume], ['Duration', n.duration]]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="flex-1 rounded-[8px] bg-os-chrome-ink/6 px-[8px] py-[6px] text-center">
                    <div className="text-[14px] leading-[18px] font-semibold text-os-chrome-ink">{value}</div>
                    <div className="text-[10px] leading-[14px] text-os-chrome-ink/55">{label}</div>
                  </div>
                ))}
            </div>
          )}
          <div className="mt-[10px] text-center text-[11px] leading-[16px] text-os-chrome-ink/55">
            Unlock to take action
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lock Screen ────────────────────────────────────────────────────────────

function PhoneLockScreen({ notifications, onUnlock, onPullShade }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (notifications.length > 0) setExpandedIdx(notifications.length - 1);
  }, [notifications.length]);

  return (
    // The wallpaper. fontFamily: 'Inter, …' is GONE from here and from the two
    // surfaces below: it forced the FALLBACK face over Figtree, which is why
    // InAppBanner and HeadsUpNotification — near-identical cards — rendered in
    // two different typefaces. Nothing declares a family now, so all four
    // inherit --font-sans-stack like the rest of the app.
    <div className="absolute inset-0 z-[300] flex flex-col bg-[linear-gradient(160deg,var(--os-wallpaper-from)_0%,var(--os-wallpaper-via)_50%,var(--os-wallpaper-to)_100%)] text-os-chrome-ink">
      <div className="mb-[20px] pt-[50px] text-center">
        {/* The oversized, tightly-tracked lock clock — preserved, because an OS
            clock is nothing like any type in the app and should not be. Weight
            200 could not paint in either loaded face (Figtree and Inter both
            start at 300) so it was silently rendering at 300 anyway; it says
            300 now, which is the lightest weight that is actually real. */}
        <div className="text-[56px] leading-[56px] font-light tracking-[-2px]">{timeStr}</div>
        <div className="mt-[4px] text-[14px] leading-[20px] text-os-chrome-ink/55">{dateStr}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-[12px]">
        {notifications.length === 0 && <div className="mt-[40px] text-center text-[13px] leading-[18px] text-os-chrome-ink/55">No notifications</div>}
        {notifications.map((n, i) => (
          <LockCard key={i} notification={n} expanded={expandedIdx === i}
            onToggleExpand={() => setExpandedIdx(expandedIdx === i ? null : i)} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-[8px] pt-[12px] pb-[20px]">
        {notifications.length > 0 && (
          // '↓ Pull down for actions' drew its arrow as a literal character.
          // It is a real icon now, like every other glyph in v2.
          <div onClick={onPullShade}
            className="flex cursor-pointer items-center gap-[4px] rounded-full border border-solid border-os-chrome-ink/10 bg-os-chrome-ink/8 px-[14px] py-[6px] text-[11px] leading-[16px] text-os-chrome-ink/55">
            <ChevronDown size={13} aria-hidden="true" />
            Pull down for actions
          </div>
        )}
        <div onClick={onUnlock}
          className="flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-full border border-solid border-os-chrome-ink/10 bg-os-chrome-ink/8 text-os-chrome-ink/55">
          <LockOpen size={20} aria-hidden="true" />
        </div>
        <div className="text-[11px] leading-[16px] text-os-chrome-ink/55">Tap to unlock</div>
      </div>
    </div>
  );
}

// ─── Notification Shade (pulled down — actions visible) ─────────────────────

function ShadeCard({ notification: n, onAction, version }) {
  const timeStr = new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const ignored = sysId ? isIgnored(sysId) : false;
  void version;  // re-render trigger after action

  return (
    <div className={cn(
      'overflow-hidden rounded-os-notification border border-solid border-os-chrome-ink/6 bg-os-shade-card backdrop-blur-[20px]',
      CARD_STACK_GAP,
    )}>
      {/* Top accent bar removed (Option A) - category circle carries severity. */}
      <div className={OS_CARD_INSET}>
        <div className={cn('mb-[6px] flex items-center', HEADER_GAP)}>
          <WintMark dark />
          <span className="text-[13px] leading-[18px] font-semibold text-os-chrome-ink">Wint</span>
          {/* This surface shows the bare state, with no actor — so it does not
              read getInvestigatingInfo / getIgnoredInfo at all. It used to
              call both and discard the results. */}
          <StatusPills dark investigating={investigating} ignored={ignored} />
          <span className="ml-auto text-[11px] leading-[16px] text-os-chrome-ink/55">{timeStr}</span>
        </div>
        <div className={cn('flex items-start', TITLE_GAP)}>
          <CategoryCircle notification={n} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] leading-[18px] font-semibold text-os-chrome-ink">{stripLeadingEmoji(n.title)}</div>
            <div className="mt-[4px] text-[13px] leading-[18px] text-os-chrome-ink/70">{n.body}</div>
          </div>
        </div>
        <NotifActions notification={n} onAction={onAction} dark />
      </div>
    </div>
  );
}

function PhoneShade({ notifications, onAction, onClose, version }) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="absolute inset-0 z-[300] flex flex-col bg-[linear-gradient(180deg,var(--os-shade-bg-from)_0%,var(--os-shade-bg-to)_100%)] text-os-chrome-ink backdrop-blur-[8px]">
      <div className="flex items-center justify-between px-[18px] pt-[16px] pb-[8px]">
        <div className="text-[13px] leading-[18px] font-semibold text-os-chrome-ink/70">{timeStr}</div>
        {/* 'Close ✕' drew its glyph as a literal character; it is the house
            CloseFill now. */}
        <div onClick={onClose}
          className="flex cursor-pointer items-center gap-[4px] text-[12px] leading-[16px] font-medium text-os-chrome-ink/70">
          Close
          <CloseFill size={12} aria-hidden="true" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-[12px] pt-[6px] pb-[20px]">
        {notifications.length === 0 && <div className="mt-[40px] text-center text-[13px] leading-[18px] text-os-chrome-ink/55">No notifications</div>}
        {notifications.map((n, i) => (
          <ShadeCard key={i} notification={n} onAction={onAction} version={version} />
        ))}
      </div>
    </div>
  );
}

// ─── In-App Banner ──────────────────────────────────────────────────────────
//
// The one surface of the four that is a WINT surface rather than OS chrome:
// it is drawn over the app, by the app. So it takes house tokens throughout —
// --card ground, --foreground ink, the house 18px radius — and none of the
// --os-* family.

function InAppBanner({ notification: n, onAction, onDismiss, version }) {
  const [startY, setStartY] = useState(null);
  useEffect(() => { const t = setTimeout(onDismiss, 8000); return () => clearTimeout(t); }, [n, onDismiss]);
  void version;

  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const investigatingInfo = sysId ? getInvestigatingInfo(sysId) : null;
  const ignored = sysId ? isIgnored(sysId) : false;
  const ignoredInfo = sysId ? getIgnoredInfo(sysId) : null;

  return (
    // The `bannerIn` keyframe used to be injected by an inline <style> right
    // here, which meant HeadsUpNotification — which also animates with it, and
    // never mounts at the same time as this component — had no entrance at
    // all. It lives in index.css now and both surfaces slide.
    <div onTouchStart={(e) => setStartY(e.touches[0].clientY)}
      onTouchEnd={(e) => { if (startY !== null && e.changedTouches[0].clientY < startY - 30) onDismiss(); setStartY(null); }}
      className="absolute top-[6px] right-[6px] left-[6px] z-[250] animate-[bannerIn_0.3s_ease]">
      {/* --shadow-overlay, the house's float tier. An OS-grade notification
          sits higher than a card, and that is the token that says so. */}
      <div className="overflow-hidden rounded-[18px] bg-card [box-shadow:var(--shadow-overlay)]">
        {/* Top accent bar removed (Option A) - category circle carries severity. */}
        <div className={APP_CARD_INSET}>
          {/* Top row: Wint logo + name + status pill + timestamp. */}
          <div className={cn('mb-[6px] flex flex-wrap items-center', HEADER_GAP)}>
            <WintMark />
            <span className="text-[12px] leading-[16px] font-semibold text-foreground">Wint</span>
            <StatusPills {...{ investigating, ignored, investigatingInfo, ignoredInfo }} />
            <span className="ml-auto text-[11px] leading-[16px] text-muted-foreground">now</span>
          </div>
          {/* Title row: category circle + title text, mirroring timeline rows. */}
          <div className={cn('flex items-start', TITLE_GAP)}>
            <CategoryCircle notification={n} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] leading-[18px] font-semibold text-foreground">{stripLeadingEmoji(n.title)}</div>
              {/* Full V11 body shown - no line clamp, no truncation. Banner
                  grows to fit. Auto-dismisses after 8s so the user has time to
                  read flow rate / volume / shutoff threshold. */}
              <div className="mt-[4px] text-[13px] leading-[18px] break-words whitespace-normal text-muted-foreground">{n.body}</div>
            </div>
          </div>
          <NotifActions notification={n} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}

// ─── Other App Screen ───────────────────────────────────────────────────────

function OtherAppScreen({ headsUp, onAction, version }) {
  return (
    <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-background">
      <div className="text-[15px] leading-[20px] text-slate-300">Another App</div>
      {headsUp && <HeadsUpNotification notification={headsUp} onAction={onAction} version={version} />}
    </div>
  );
}

function HeadsUpNotification({ notification: n, onAction, version }) {
  const sysId = n.systemId;
  const investigating = sysId ? isInvestigating(sysId) : false;
  const investigatingInfo = sysId ? getInvestigatingInfo(sysId) : null;
  const ignored = sysId ? isIgnored(sysId) : false;
  const ignoredInfo = sysId ? getIgnoredInfo(sysId) : null;
  void version;

  return (
    <div className="absolute top-[30px] right-[8px] left-[8px] z-[350] animate-[bannerIn_0.3s_ease]">
      <div className="overflow-hidden rounded-[18px] bg-card [box-shadow:var(--shadow-overlay)]">
        {/* Top accent bar removed - category circle below carries the
            severity signal (Option A — mirrors timeline anatomy). */}
        <div className={OS_CARD_INSET}>
          <div className={cn('mb-[6px] flex flex-wrap items-center', HEADER_GAP)}>
            <WintMark size={20} />
            <span className="text-[12px] leading-[16px] font-semibold text-foreground">Wint</span>
            <StatusPills {...{ investigating, ignored, investigatingInfo, ignoredInfo }} />
            <span className="ml-auto text-[11px] leading-[16px] text-muted-foreground">now</span>
          </div>
          {/* Title row: category circle + title text, mirroring timeline rows. */}
          <div className={cn('flex items-start', TITLE_GAP)}>
            <CategoryCircle notification={n} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] leading-[18px] font-semibold text-foreground">{stripLeadingEmoji(n.title)}</div>
              <div className="mt-[4px] text-[13px] leading-[18px] text-muted-foreground">{n.body}</div>
            </div>
          </div>
          <NotifActions notification={n} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}

// ─── Main wrapper ───────────────────────────────────────────────────────────

export default function PushNotifications({ children }) {
  const navigate = useNavigate();
  const [phoneState, setPhoneState] = useState('inapp');
  const [notifications, setNotifications] = useState([]);
  const [banner, setBanner] = useState(null);
  const [headsUp, setHeadsUp] = useState(null);
  const [version, setVersion] = useState(0);   // bump after store mutations to re-render reflection

  useEffect(() => {
    if (!channel) return;
    const handler = (e) => {
      const ev = e.data;
      const { type, payload } = ev;
      // IMPORTANT: this handler is UI-only - it does NOT mutate localStorage.
      // Why: same-browser tabs share localStorage, so the sender's local
      // apply is already visible here. The bridge subscriber (below) is the
      // only OTHER writer; for cross-device pushes it applies + relays to
      // this same channel so the UI updates the same way.
      if (type === 'lock-phone') { setPhoneState('locked'); setBanner(null); setHeadsUp(null); }
      else if (type === 'shade')      { setPhoneState('shade'); setBanner(null); setHeadsUp(null); }
      else if (type === 'other-app')  { setPhoneState('other-app'); setBanner(null); setNotifications([]); }
      else if (type === 'unlock-phone') { setPhoneState('inapp'); setNotifications([]); setHeadsUp(null); }
      else if (type === 'demo-reset' || type === 'actor-changed' || type === 'data-changed') {
        // Storage was already mutated by the sender / bridge. Just trigger
        // re-render so consumers re-read.
        setVersion(v => v + 1);
      }
      else if (type === 'push') {
        // Set the notification UI surface for whichever phoneState we're in.
        // localStorage is already updated by the sender (same-browser) or by
        // the bridge subscriber (cross-device).
        if (phoneState === 'locked' || phoneState === 'shade') setNotifications(prev => [...prev, payload]);
        else if (phoneState === 'other-app') setHeadsUp(payload);
        else setBanner(payload);
        setVersion(v => v + 1);
      }
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  }, [phoneState]);

  // Cross-tab: storage events fire when another tab mutates localStorage —
  // catches actor changes from the simulator, plus investigating/ignored/tag
  // mutations made from other open tabs.
  useEffect(() => {
    const onStorage = () => setVersion(v => v + 1);
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Cross-device: subscribe to the ntfy.sh bridge. Events from a desktop
  // /push-panel arrive here, get applied to the local data layer, and are
  // re-posted on the BroadcastChannel so the existing handler above picks
  // them up unchanged.
  //
  // The bridge also carries two metadata event types that don't get mirrored
  // to the local channel:
  //   - 'phone-persona-request' (from desktop): re-publish our persona scope
  //   - 'phone-persona'         (from another phone): ignore — for desktop only
  const userCtx = useUserContext() || {};
  const personaRef = useRef(userCtx.persona);
  useEffect(() => { personaRef.current = userCtx.persona; }, [userCtx.persona]);

  useEffect(() => {
    const unsub = bridgeSubscribe(
      (event) => {
        if (event.type === 'phone-persona-request') {
          // Desktop explicitly asked us to re-announce - honor it directly
          // (not throttled; this is an on-demand request).
          const ev = buildPhonePersonaEvent(personaRef.current);
          if (ev) bridgePublish(ev);
          return;
        }
        if (event.type === 'phone-persona') return;   // desktop-only metadata
        applyDataLayerSideEffects(event);
        if (relayChannel) relayChannel.postMessage(event);
        setVersion(v => v + 1);
      },
      {
        // Re-announce persona on (re)connect, BUT throttled so we don't
        // blow the ntfy.sh rate budget if the bridge flaps repeatedly.
        onOpen: () => {
          const ev = buildPhonePersonaEvent(personaRef.current);
          publishPhonePersonaIfChanged(ev, bridgePublish);
        },
      }
    );
    return () => unsub();
  }, []);

  // Whenever the phone's persona changes, announce the new scope to any
  // desktop /push-panel that's listening. Also fires on initial mount.
  // Throttled so a double-mount or rapid persona toggle doesn't burn the
  // ntfy.sh hourly quota.
  useEffect(() => {
    const ev = buildPhonePersonaEvent(userCtx.persona);
    publishPhonePersonaIfChanged(ev, bridgePublish);
  }, [userCtx.persona]);

  // Returns to app + clears all notification UI, then navigates. Auth state
  // is preserved — the user stays logged in unless they explicitly log out
  // (or sessionStorage is cleared by other means). The deep-link-via-login
  // path that used to fire here was simulating an OS cold-start, which is
  // unwanted friction for the working demo.
  const enterAppAndNavigate = useCallback((path) => {
    setPhoneState('inapp');
    setNotifications([]);
    setHeadsUp(null);
    setBanner(null);
    if (path) navigate(path);
  }, [navigate]);

  const handleAction = useCallback((action, n) => {
    const sysId = n.systemId;

    // Water-event lifecycle pushes all land on the System page (Overview).
    // The Water Event card + Valve widget there show the current state.
    // `?pulse=1` triggers a 2-second arrival pulse on the Water Event card so
    // the user immediately sees what their push referred to.
    if (action === 'view') {
      if (sysId) enterAppAndNavigate(`/system/${sysId}?pulse=1`);
      return;
    }

    if (action === 'investigate') {
      // Mark investigating in the shared store. Stay on current surface; bump
      // version so visible cards re-read state and reflect the change.
      //
      // BUG FIX — the guard. startInvestigating was called unconditionally
      // here, where EventFocusOverlay.jsx:1432, SystemPageV2Screen.jsx:1388
      // and WaterEventDetailsWidget.jsx:155 all check first. Without it, a
      // second person tapping "On it" on a push overwrote the first person's
      // claim AND reset their elapsed timer, silently — the push was the one
      // surface in the app where claiming was destructive.
      if (sysId && !isInvestigating(sysId)) startInvestigating(sysId, { actor: getCurrentActor() });
      setVersion(v => v + 1);
      return;
    }

    if (action === 'ignore') {
      // Ignore is irreversible + fires an IoT-device command. Open the System
      // page with ?action=ignore so the Water Event card's chip-based Ignore
      // bottom sheet auto-opens on arrival.
      if (sysId) enterAppAndNavigate(`/system/${sysId}?action=ignore&pulse=1`);
      return;
    }

    if (action === 'tag') {
      // Open System page with ?action=tag so the Tag bottom sheet auto-opens
      // on arrival (PRD 15 § 7.1).
      if (sysId) enterAppAndNavigate(`/system/${sysId}?action=tag&pulse=1`);
      return;
    }

    if (action === 'dismiss') {
      // Local-only: remove this push from the current surface. No server change.
      // Kept for back-compat; new action set doesn't use this on Ongoing /
      // End-of-Leak any more (swipe-to-dismiss is native).
      setNotifications(prev => prev.filter(p => p !== n));
      if (banner === n) setBanner(null);
      if (headsUp === n) setHeadsUp(null);
      return;
    }
  }, [enterAppAndNavigate, banner, headsUp]);

  const dismissBanner = useCallback(() => setBanner(null), []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {children}

      {phoneState === 'locked' && (
        <PhoneLockScreen notifications={notifications}
          onUnlock={() => { setPhoneState('inapp'); setNotifications([]); }}
          onPullShade={() => setPhoneState('shade')} />
      )}

      {phoneState === 'shade' && (
        <PhoneShade notifications={notifications} onAction={handleAction} version={version}
          onClose={() => setPhoneState('locked')} />
      )}

      {phoneState === 'other-app' && (
        <OtherAppScreen headsUp={headsUp} onAction={handleAction} version={version} />
      )}

      {phoneState === 'inapp' && banner && (
        <InAppBanner notification={banner} onAction={handleAction} onDismiss={dismissBanner} version={version} />
      )}
    </div>
  );
}
