/**
 * buildTree.js — turns the vendored MRG snapshot into the shapes this app
 * already consumes (SYSTEMS / ACCOUNT_HIERARCHIES / ACCOUNTS / SCOPES).
 *
 * Everything here is derived. Nothing is hand-maintained, which is the point:
 * the old data layer kept the hierarchy in three hand-written places (the tree
 * in hierarchy.js, the flat l1..l4 fields on every system, and the SCOPES list)
 * and they drifted. One source, three derived views.
 *
 * LEVEL MAPPING
 *   The web tree is three location levels deep:
 *     Country  ("United States")
 *     Division ("Office" | "Residential")
 *     Site / Building ("100 Meridian Plaza" | "Building A")  ← systems hang here
 *   This app's shape allows four, and treats L4 as "the building that holds
 *   systems": `/l4/:l4id` is the leaf-location route, L4Screen filters on
 *   `s.l4`, and WintSidebar reads `systems[0].l4`. So the leaf location is
 *   mapped to L4 and the UNUSED level is the middle one — `l3`/`l3Name` are
 *   null. Mapping the leaf to L3 instead would have left `/l4/:l4id` pointing
 *   at nothing and broken leaf-location navigation.
 *
 *   General rule: l4 = the system's immediate parent location; l1/l2/l3 = the
 *   locations above it, in order. A deeper tree fills l3 in naturally.
 */
import snapshot from './mrg-snapshot.json';
import {
  BUILD_NOW,
  displayId,
  stableHash,
  mix32,
  systemEventType,
  resolvedVariant,
  systemErrorKind,
  ALL_CLEAR_LOCATION_IDS,
} from './parity';
import { readFleetState, FLEET_CLEAR } from '../fleetState';

/* ── FLEET STATE ─────────────────────────────────────────────────────────────
   'live' (the default) or 'clear'. Read ONCE, here, at module scope: this file
   evaluates at import, so the mode cannot change without a full page reload and
   pretending otherwise would leave a stale tree beside a flipped flag.

   'clear' is not a second dataset and not a second snapshot. It is the two
   budgets below moved to their limits — every site clean, no water events — so
   the entities (accounts, locations, systems, ids, names, addresses) are
   identical in both modes by construction. See src/data/fleetState.js. */
export const FLEET_STATE = readFleetState();
const ALL_CLEAR = FLEET_STATE === FLEET_CLEAR;

/* The share of a location's systems that may carry an active water event at
   once. Owner-set, 2026-10-24. Exported so the invariant test asserts against
   the same number the generator uses, rather than a second copy of 0.2 that
   can drift away from it.

   Zero in 'clear' mode. Belt and braces with the clean floor below — with every
   site clean this cap is never consulted, but a site that somehow escaped the
   clean set must still spend no events. */
export const WATER_EVENT_SITE_CAP = ALL_CLEAR ? 0 : 0.2;

export const SNAPSHOT_META = snapshot._meta;
export const ROOT_ACCOUNT_ID = snapshot.rootAccountId;

// ── Derived per-system device state ──────────────────────────────────────────
// WHICH systems carry an error starts from the web's own `generateBadges` flag
// (see systemErrorKind in parity.js); WHICH error it is, and the benign
// variations below (a closed valve, a system on battery), are derived here.
// Both are now subject to the per-site budget in "CLEAN SITES FIRST" below —
// read that before changing anything here, because faults, water events and
// recipients are no longer independent draws and cannot be made so again
// without losing the owner's ≥50%-clean-sites guarantee.
//
// A closed valve and a battery-powered system are NOT faults (project rule:
// "Valve closed is NOT an issue"), so they are drawn independently of the
// error flag and never produce an alert on their own.
function derived(id, salt, buckets) {
  // Through mix32 so these don't correlate with the leak hash — see parity.js.
  return buckets[mix32(stableHash(`${salt}:${id}`)) % buckets.length];
}

const BENIGN_VALVE = ['open', 'open', 'open', 'open', 'open', 'open', 'open', 'closed'];
const BENIGN_POWER = ['ac', 'ac', 'ac', 'ac', 'ac', 'ac', 'ac', 'ac', 'battery'];

function relativeAge(hoursAgo) {
  if (hoursAgo < 1) return `${Math.round(hoursAgo * 60)}m`;
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ${String(Math.round((hoursAgo % 1) * 60)).padStart(2, '0')}m`;
  const days = Math.floor(hoursAgo / 24);
  return `${days}d ${Math.round(hoursAgo % 24)}h`;
}

/* -- THE SIX-HOUR CEILING ON EVERY GENERATED DURATION -- 2026-11-10 ---------
   Owner, on an event card reading "1d 12h 11m" under Duration: "in the data
   simulation on the events, I want to see maximum six hours. Not more than
   that. In the mock data,". A leak that has been running for a day and a half
   is not a scenario this demo should put in front of a customer.

   IT IS APPLIED AT THE ROLL, AND NOWHERE ELSE. Clamping in a display helper
   would have recreated the exact defect the 2026-11-04 one-record change
   removed: a card printing "6h 00m" over a record that still says 36 hours,
   beside a Detected stamp from yesterday and a timeline that agrees with
   neither. Every surface in the app computes its duration from `durationSec`
   and `detectedAtIso` on the record below, so capping the record caps all of
   them by construction -- the hero card, the location rows, the "View all"
   overlay, the event overlay's stat block, both Events Timelines, /alerts and
   the `ago` chip.

   DETERMINISTIC, AND STILL VARIED. The spread comes out of the same
   `stableHash` the rest of the record is built from -- no `Math.random()`, and
   no `Date.now()` at generation or at render -- and the minutes term keeps
   every event on its own value rather than parking the whole fleet on a flat
   "6h 00m", which would look broken in a new way. */
export const MAX_EVENT_HOURS = 6;

/* Whole-hour buckets below the ceiling: 1h..5h. */
const SPAN_HOURS = MAX_EVENT_HOURS - 1;

/**
 * How long a generated event has been running, in hours: deterministic in `h`,
 * varied to the minute, and strictly below MAX_EVENT_HOURS (1h 00m .. 5h 59m).
 *
 * THE ONE SPAN. Water events and device faults both come through here, so
 * there is one ceiling to move rather than four scattered literals -- the
 * water event rolled `1 + (h % 11) + (h % 60) / 60` (up to 11h 59m) and the
 * three fault kinds rolled `1 + (h % 40)`, `1 + (h % 30)` and `1 + (h % 12)`
 * (up to 40h, 30h and 12h) in `buildEventFor` below. The salts stay where they
 * were, so the kinds still land on different values.
 */
function spanHours(h) {
  return 1 + (h % SPAN_HOURS) + (h % 60) / 60;
}

/**
 * `resolvedVariant` with the six-hour ceiling applied to the CLOSED event it
 * describes -- the one producer of "how long did this system's resolved water
 * event run".
 *
 * WHY THE CAP REACHES HISTORY TOO. The owner's sentence is "in the mock data",
 * which does not distinguish the active event from the resolved one, and a
 * three-day resolved leak is exactly as unrealistic in a demo as a three-day
 * active one -- it is drawn in the same rows, by the same components, from the
 * same `durationSec`. Narrowing this back to active events only is a one-line
 * change here (drop this wrapper and hand `resolvedVariant` straight through).
 *
 * IT LIVES HERE, NOT IN parity.js. That file is a VERBATIM port of the web
 * app's own functions and its header says so; diverging it would silently
 * break the side-by-side comparison it exists for. The ceiling is this app's
 * demo-realism decision, so it is applied where this app builds its record.
 *
 * ONE FIX RIDES ALONG. `resolvedHoursAgo` used to subtract `durationHours`
 * only, discarding `durationMins`, so the seconds every consumer derived from
 * the two instants were hour-aligned while the `totalDuration` STRING printed
 * beside them carried the minutes: `ws-9578` read "2h 10m" on the card over a
 * record that said exactly 2h. Same two-spellings-of-one-fact defect as the
 * rest of this module's history. The minutes are in the instant now, so the
 * derived duration and the printed one are the same number.
 */
export function cappedResolvedVariant(id) {
  const v = resolvedVariant(id);
  /* The same `stableHash(systemId)` resolvedVariant itself rolls, so the
     capped duration is a function of the same seed and nothing else moves. */
  const h = stableHash(id);
  const durationHours = 1 + (h % SPAN_HOURS); // was 1 + (h % 11) -- up to 11h 59m
  const durationMins = h % 60;
  const totalHours = durationHours + durationMins / 60;
  return {
    ...v,
    resolvedHoursAgo: Math.max(1, v.detectedHoursAgo - totalHours),
    /* Volume follows the duration it was accumulated over, or the card would
       caption a six-hour event with a day and a half of water. */
    totalVolume: Math.round(v.flowLph * totalHours),
    totalDuration: `${durationHours}h ${String(durationMins).padStart(2, '0')}m`,
  };
}

/**
 * -- THE CANONICAL EVENT RECORD ----------------------------------------------
 *
 * ONE EVENT, ONE RECORD, BUILT ONCE. Owner, 2026-11-04: "It doesn't matter
 * where you are looking from on specific event. If you are looking at it from
 * the location page, from the account page, or system page, or even the event
 * page, all data needs to be, always, to reflect the same data."
 *
 * WHAT WAS WRONG. Three generators each rolled their OWN `hoursAgo` for the
 * same event, from three different hash salts, and then ran the identical
 * formula over them:
 *
 *   buildTree.js          stableHash('active:'   + id) -> 10.1167 h
 *   generateEvents.js     stableHash('event:'    + id) ->  9.8167 h
 *   generateIncidents.js  stableHash('incident:' + id) ->  5.6833 h
 *
 * For esrt-bldg-A-apt-2 that is 18 minutes of disagreement between the alert
 * card and the Alerts list, and 4h 26m between the alert card and the event
 * screen's timeline. generateEvents even carried a comment saying it
 * "[r]econstruct[s] the alert's start from its age label so event and alert
 * agree" - it never read the alert, it re-rolled.
 *
 * THE OTHER TWO SALTS ARE GONE. `generateEvents.js` and `generateIncidents.js`
 * are now projections of this record: they keep their exported shapes so no
 * consumer moves, but every clock, duration, figure and id in them traces back
 * to the object below.
 *
 * THE FIELD THE WHOLE BUG HINGED ON is `detectedAtIso`: a full ISO instant,
 * never a bare clock. `startedAt` used to be "HH:MM" with no day, and
 * `events.js` stamped it onto TODAY unconditionally - which is how the Alerts
 * list came to show this event at a FUTURE time today with a duration of `0s`
 * (negative, clamped by Math.max(0, ...)). The bare clock is still emitted for
 * the compact surfaces that draw one, but it is DERIVED from the instant, so
 * the two cannot disagree about the minute.
 *
 * ALL CLOCKS COME OFF `BUILD_NOW` (parity.js), read once per page load. They
 * still advance between loads - all of them, by the same delta.
 */
function buildEventRecord(id, leak, valve) {
  if (!leak) return null;
  const h = stableHash(`active:${id}`);
  /* THE ONE ROLL. `active:` survives because it is the seed the alert card -
     the surface most people look at - already used, so unifying on it moves
     the fewest numbers on screen.
     It read `1 + (h % 11) + (h % 60) / 60` until 2026-11-10, which ran to
     11h 59m; `spanHours` is the same formula under the six-hour ceiling. */
  const hoursAgo = spanHours(h);
  const flowLph = leak === 'high' ? 120 + (h % 480) : 18 + (h % 34);
  const volumeL = Math.round(flowLph * hoursAgo);
  const detectedAtMs = BUILD_NOW - hoursAgo * 3600000;
  /* Offsets are applied HERE, at BUILD time, so every reader gets the same
     instant for the same milestone rather than re-deriving it against its own
     `now`. */
  const at = offsetH => new Date(detectedAtMs + offsetH * 3600000).toISOString();

  /* The lifecycle. Longer-running events accumulate more of it, so the demo
     has both short "just detected" and rich multi-step timelines - the same
     thresholds generateIncidents.js applied, now gated on the ONE duration
     instead of on a seed unrelated to it. */
  const milestones = [
    { kind: 'detected', atIso: at(0), flowLph },
    { kind: 'alert-sent', atIso: at(0) },
  ];
  if (hoursAgo > 2) {
    milestones.push({ kind: 'on-it', atIso: at(0.4) });
    milestones.push({ kind: 'continues', atIso: at(1), flowLph });
  }
  if (hoursAgo > 5 && leak === 'high') {
    milestones.push({ kind: 'volume-milestone', atIso: at(3), volumeL: 1000 });
  }
  if (valve === 'closed') {
    milestones.push({ kind: 'valve-closed', atIso: at(Math.min(hoursAgo - 0.1, 4)) });
  }

  return {
    /* THE ONE EVENT ID. `displayId('LK', id)` is the form /events/system/:id
       already showed, so it is the survivor; events.js's `hashId` and the
       overlay's `toLeakId` are retired. */
    eventId: displayId('LK', id),
    systemId: id,
    type: leak === 'high' ? 'leak-high' : 'leak-low',
    label: leak === 'high' ? 'High Flow Water Event' : 'Low Flow Water Event',
    detectedAtIso: new Date(detectedAtMs).toISOString(),
    /* PRESENCE IS WHAT "RESOLVED" MEANS. An active event has none. */
    endedAtIso: null,
    /* Derived once from the instants. Never re-rolled. */
    durationSec: Math.round(hoursAgo * 3600),
    /* NUMBERS, not pre-formatted strings. The alert below formats them for
       display; anything that needs to compute reads these. */
    flowLph,
    volumeL,
    /* THE STATUS PILL, off this record. It used to come from `getLeakState`,
       which asked which STEPS an incident had - and those steps were gated on
       the incident seed, so the pill beside a duration was decided by a draw
       with nothing to do with it. Same three states, same thresholds, one
       source. */
    status: valve === 'closed' ? 'ShutOff' : hoursAgo > 2 ? 'Ongoing' : 'Warning',
    milestones,
  };
}

/** `relativeAge` over the record's seconds, so both read one duration. */
function relativeAgeOf(seconds) {
  return relativeAge(seconds / 3600);
}

/**
 * "Apr 02, 2026 08:13:15" - the format the Alert card's Detected line draws
 * (Figma 199394:79703).
 */
function stampOf(ms) {
  const d = new Date(ms);
  const p2 = (n) => String(n).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${month} ${p2(d.getDate())}, ${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/** The bare wall clock of an instant. DERIVED, never rolled separately. */
function clockOf(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const FAULT_ID_PREFIX = { offline: 'CM', 'valve-error': 'VE', 'power-lost': 'PW' };

/**
 * A fault's own single-seed record. Faults are NOT water events - they carry
 * no flow, no volume and no lifecycle - but they are alerts, and every alert
 * now carries an absolute instant so that no surface has to recover a day from
 * a bare clock. Each fault kind already had exactly one salt, so there was no
 * three-way split here to collapse; what is new is the ISO instant.
 */
function faultRecord(id, type, label, salt) {
  const h = stableHash(`${salt}:${id}`);
  /* The `span` CALLBACK IS GONE -- 2026-11-10. Each kind used to carry its own
     whole-hour range (offline `1 + (h % 40)`, power `1 + (h % 30)`, valve
     `1 + (h % 12)`), which is how a comms loss came to be announced as "1d 9h"
     old. A fault is an event and the owner's ceiling is on events, so it rolls
     the same capped span a water event does. The kind still varies because the
     SALT still varies. */
  const hoursAgo = spanHours(h);
  const detectedAtIso = new Date(BUILD_NOW - hoursAgo * 3600000).toISOString();
  return {
    eventId: displayId(FAULT_ID_PREFIX[type], id),
    systemId: id,
    type,
    label,
    detectedAtIso,
    endedAtIso: null,
    durationSec: Math.round(hoursAgo * 3600),
    flowLph: null,
    volumeL: null,
    status: 'Ongoing',
    milestones: [{ kind: 'detected', atIso: detectedAtIso }],
  };
}

/**
 * The active-event card for a system, or null when it has no active event.
 *
 * A PROJECTION of the record above - every field here is formatted FROM it,
 * nothing is drawn independently. The pre-formatted strings stay because every
 * compact surface in the app reads them, but they are now one source's output.
 */
function alertFromRecord(rec) {
  if (!rec) return null;
  const ms = new Date(rec.detectedAtIso).getTime();
  const isLeak = rec.type === 'leak-high' || rec.type === 'leak-low';
  return {
    type: rec.type,
    label: rec.label,
    age: relativeAgeOf(rec.durationSec),
    /* THE ABSOLUTE INSTANT. Every surface's Detected line resolves from this
       one field; nothing reconstructs a day from a clock any more. */
    startedAtIso: rec.detectedAtIso,
    /* Derived from the same instant - the compact surfaces (the flow chart's
       axis, the timeline rows) still want a bare clock, and this one cannot
       drift from the stamp beside it because both are `detectedAtIso`
       formatted. */
    startedAt: clockOf(ms),
    startedAtStamp: stampOf(ms),
    durationSec: rec.durationSec,
    eventId: rec.eventId,
    status: rec.status,
    volume: isLeak ? `${rec.volumeL.toLocaleString('en-US')}L` : null,
    flowRate: isLeak ? `${rec.flowLph} L/hour` : null,
  };
}

/**
 * The record behind a system's alert: the canonical water event when it has
 * one, otherwise the fault it is in, in the app's existing priority order.
 * A leak outranks a device fault - see FAULT_EVENT_PRIORITY below.
 */
function buildEventFor(id, leak, valve, comm, power) {
  if (leak) return buildEventRecord(id, leak, valve);
  if (comm === 'offline') return faultRecord(id, 'offline', 'System Offline', 'offline');
  if (valve === 'error') return faultRecord(id, 'valve-error', 'Valve error', 'valve');
  if (power === 'ac-lost') return faultRecord(id, 'power-lost', 'AC Power Lost', 'power');
  return null;
}

// ── Walk the snapshot tree ───────────────────────────────────────────────────
const systems = [];
const hierarchyRoots = [];

// Every system node, in document order, with the locations above it. The walk
// only COLLECTS; state is decided afterwards, because the clean/problem
// partition below is a per-SITE decision and a system cannot be given its state
// until its whole site has been seen. See "CLEAN SITES FIRST".
const pending = [];

const TYPE_FOR_DEPTH = ['level1', 'level2', 'level3', 'level4'];

function walk(node, ancestors) {
  if (node.type === 'system') {
    // l4 is the immediate parent (the location that holds systems); everything
    // above it fills l1/l2/l3 in order. See the LEVEL MAPPING note above.
    const parent = ancestors[ancestors.length - 1];
    const above = ancestors.slice(0, -1);
    const [l1, l2, l3] = above;
    pending.push({ node, l1, l2, l3, l4: parent });
    return { id: node.id, name: node.name, type: 'system' };
  }

  const depth = ancestors.length;
  // A location whose children are systems is the leaf — the app calls that L4
  // regardless of how deep it sits, and the `/l4/:l4id` route keys off it.
  const isLeafLocation = (node.children || []).some(c => c.type === 'system');
  const out = {
    id: node.id,
    name: node.name,
    type: isLeafLocation ? 'level4' : TYPE_FOR_DEPTH[depth] || 'level4',
    levelType: node.levelName || 'Location',
    ...(node.address ? { address: node.address } : {}),
    ...(node.site ? { site: node.site } : {}),
    children: [],
  };
  out.children = (node.children || []).map(child => walk(child, [...ancestors, node]));
  return out;
}

for (const country of snapshot.tree) hierarchyRoots.push(walk(country, []));

/* ── CLEAN SITES FIRST, PROBLEMS SECOND ──────────────────────────────────────
   Owner, 2026-10-22: "maximum 50% of systems unhealthy, maximum. And maximum
   50% of sites are unhealthy. So we have at least 50% of the sites are super
   healthy, no water events and no any errors. So I can see two variants to see
   how it looks. Make all of them like kind of unique."

   WHY THE GENERATION IS INVERTED. Faults and water events used to be drawn
   INDEPENDENTLY — `systemErrorKind` for faults, `systemEventType` for events,
   neither aware of the other or of the site. Independent draws cannot produce a
   JOINT guarantee: at the old rates 31% of systems carried a fault and 47% an
   event, and only 3 of 17 sites came out clean on both, because a site is clean
   only if EVERY system in it is. Three sites (220/240 Harborview, 700 Garnet)
   were 5/5 unhealthy, i.e. 100% unhealthy at their own scope — which is what
   the owner was looking at. No amount of rate-tuning on independent draws fixes
   that; the ORDER has to change. So: pick the clean sites first, force every
   system in them clear of both dimensions, and spend the problems only in what
   is left, under a per-site cap.

   WHERE THE NUMBERS HAVE TO BE TRUE. The caps are applied PER SITE, not
   fleet-wide, because a user can drill into one location and a fleet-wide
   average says nothing there. A per-site ceiling of 50% makes every coarser
   scope (division, country, "All locations") ≤50% automatically, since each is
   a sum of sites that each obey it.

   STILL A HASH OF THE ID. Every choice below goes through `stableHash`/`mix32`,
   so the fleet is identical on every reload — the same requirement the leak
   hash is held to in parity.js. No Math.random().                            */

// The four protection dimensions of PRD 09, which are exactly the four issue
// pills the System health card draws. A troubled system gets ONE of them, so
// every pill has something in it and no system double-counts.
const PROTECTION_KINDS = ['comm', 'valve', 'power', 'recipients'];

// At least this share of each parent's leaf sites is fully clean. Half is the
// owner's floor; `Math.ceil` means an odd count rounds in the clean direction
// (12 office sites → 6 clean, 5 residential buildings → 3 clean).
//
// 1 in 'clear' mode: EVERY site clean. That is the whole of the all-clear
// fleet — the clean-site path in phase 3 already empties `plan` for a clean
// site, so nothing here needs a parallel "healthy" branch, and anything the
// clean path forgets would be forgotten in both modes rather than only in one.
const CLEAN_SITE_FLOOR = ALL_CLEAR ? 1 : 0.5;

/* Residential apartments are synthetic — the web has no CRM record for them and
   renders them with no device errors at all (see systemErrorKind in parity.js),
   so the troubled ones here fail on recipients only: a tenant who never
   configured anyone to notify. That keeps the apartments free of invented
   hardware faults AND gives the Residential division a character of its own,
   which is the "make all of them kind of unique" half of the ask.

   They are also the SAME apartments that have an active event, rather than a
   scatter — "an active water event and nobody configured to hear about it" is
   a sharper story than two unrelated gaps, and it leaves every other apartment
   in a problem building completely clear. Tests rely on that last part:
   src/__tests__/fixtures.js HAPPY_PATH_APT is "any Building A apartment other
   than 2 and 5", documented as fully clear.

   Capped well below the floor(n/2) ceiling so one 10-apartment building does
   not own the whole "Missing recipients" pill. */
const RESIDENTIAL_FAULT_CAP = 2;

/* For the one event slot a problem site spends on an already-faulted system
   (see phase 3), which fault is worth putting an event on top of.

   A valve error first — once. The valve is the thing that would have STOPPED
   the water event, so a leak over a failed valve is the case the UI most needs
   to be able to draw, and src/__tests__/fixtures.js LOW_FLOW_VALVE_ERROR
   selects exactly it. But `buildEventFor` gives the leak priority, so that pairing
   HIDES the valve error's own alert card — and with only two or three valve
   errors in the whole fleet, preferring valve at every site spent all of them
   and made the "Valve error" alert type unreachable. (It did: the alert census
   went to zero valve-error cards while the pill still read 2.)

   So the preference flips after the first pairing is made: one site gets the
   leak-over-failed-valve case, every other site leaves its valve errors
   showing. A missing-recipients system stays near the back throughout — it has
   no alert card of its own, so pairing it with an event is the one combination
   that shows nothing new. */
const FAULT_EVENT_PRIORITY_FIRST = ['valve', 'comm', 'power', 'recipients'];
const FAULT_EVENT_PRIORITY_REST = ['comm', 'power', 'recipients', 'valve'];
let valveOverlapSpent = false;

/** Deterministic order over ids. mix32 for the same reason parity.js uses it:
 *  a bare `stableHash('salt:'+id)` is a fixed shift of `stableHash(id)`, which
 *  would tie these draws to the leak hash. */
function rankByHash(ids, salt) {
  return [...ids]
    .map(id => [id, mix32(stableHash(`${salt}:${id}`))])
    .sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1))
    .map(([id]) => id);
}

// Leaf sites, and the systems under each, grouped by the location that holds
// them so the clean share is honoured inside every parent rather than only
// across the fleet.
const siteOrder = [];
const recsBySite = new Map();
const sitesByParent = new Map();
for (const rec of pending) {
  const siteId = rec.l4?.id ?? ROOT_ACCOUNT_ID;
  if (!recsBySite.has(siteId)) {
    recsBySite.set(siteId, []);
    siteOrder.push(siteId);
    const parentId = rec.l3?.id ?? rec.l2?.id ?? rec.l1?.id ?? ROOT_ACCOUNT_ID;
    if (!sitesByParent.has(parentId)) sitesByParent.set(parentId, []);
    sitesByParent.get(parentId).push(siteId);
  }
  recsBySite.get(siteId).push(rec);
}

export const CLEAN_SITE_IDS = new Set();
for (const siteIds of sitesByParent.values()) {
  const need = Math.ceil(siteIds.length * CLEAN_SITE_FLOOR);
  // The snapshot's declared all-clear locations are clean by definition — that
  // is what makes the app's empty states reachable — so they are spent first
  // rather than competing for the quota.
  for (const id of siteIds) if (ALL_CLEAR_LOCATION_IDS.includes(id)) CLEAN_SITE_IDS.add(id);
  let have = siteIds.filter(id => CLEAN_SITE_IDS.has(id)).length;
  for (const id of rankByHash(siteIds, 'cleansite')) {
    if (have >= need) break;
    if (CLEAN_SITE_IDS.has(id)) continue;
    CLEAN_SITE_IDS.add(id);
    have += 1;
  }
}

/* ── THE FOUR SITE ARCHETYPES ────────────────────────────────────────────────
   Health and water events are independent AXES, so a site sits in one of four
   quadrants — and all four have to be reachable, or the separation between them
   is a claim the app cannot demonstrate:

     clean     no failed check, no event     the all-clear state
     watchful  no failed check, 2+ events    "100% healthy, with water events"
     faulted   failed checks, no event       an issue list with no leak in it
     troubled  failed checks, and events     the busy state

   `watchful` is the owner's own sentence — "systems can be 100% healthy, but
   with water events" — and it is the whole reason the health number stopped
   counting leaks. A first pass of this file had only `clean` and `troubled`, so
   that quadrant was empty at SITE scope: every site with an event also had a
   fault, and the home card could never show the case the separation exists for.
   `faulted` was empty for the mirror reason.

   The two special roles are spent AFTER the clean quota, out of the problem
   sites, so the ≥50%-clean floor is untouched. Both are a net improvement on
   the other two guarantees: a watchful site has no unhealthy systems at all,
   and a faulted one has no more than the floor(n/2) it would have had anyway.

   A site needs at least 4 systems to take a special role: `watchful` has to
   show 2+ events to read as a pattern rather than a one-off, and the event
   budget is ceil(n/2). Residential buildings are never `faulted`, because their
   faults are attached BY CONSTRUCTION to the apartments that have an event (see
   RESIDENTIAL_FAULT_CAP) — a residential site with faults and no events is not
   a shape this dataset can produce honestly.                                 */
const SITE_MIN_FOR_ROLE = 4;

/** siteId → 'clean' | 'watchful' | 'faulted' | 'troubled' */
export const SITE_ROLES = new Map();
for (const siteIds of sitesByParent.values()) {
  // Rank order, so the roles land on the same sites on every reload.
  const problems = rankByHash(siteIds, 'cleansite').filter(id => !CLEAN_SITE_IDS.has(id));
  let needWatchful = true;
  let needFaulted = true;
  for (const id of problems) {
    const recs = recsBySite.get(id);
    const bigEnough = recs.length >= SITE_MIN_FOR_ROLE;
    const residential = recs.some(r => r.node.system?.residential);
    if (needWatchful && bigEnough) {
      SITE_ROLES.set(id, 'watchful');
      needWatchful = false;
    } else if (needFaulted && bigEnough && !residential) {
      SITE_ROLES.set(id, 'faulted');
      needFaulted = false;
    } else {
      SITE_ROLES.set(id, 'troubled');
    }
  }
}
for (const id of CLEAN_SITE_IDS) SITE_ROLES.set(id, 'clean');

const recOf = new Map(pending.map(r => [r.node.id, r]));
const hasValveOf = id => {
  const node = recOf.get(id).node;
  return Boolean(node.system?.residential) || Boolean(node.system?.valveType);
};

// ── Phase 1: who is troubled, and where ──────────────────────────────────────
// Clean sites take nothing. Each problem site nominates at most floor(n/2)
// systems — the cap that makes "≤50% unhealthy" true AT THAT SITE'S OWN SCOPE,
// which is the scope a user can actually drill into.
const troubledResidential = [];
const troubledOffice = [];

for (const siteId of siteOrder) {
  // Super healthy: no fault on any dimension, no water event. The benign
  // variations (a closed valve, a system on battery) still apply in the builder
  // — project rule, "Valve closed is NOT an issue" — so a clean site still
  // looks like a real estate rather than a row of identical tiles.
  // `clean` takes nothing, and neither does `watchful` — its whole point is to
  // carry water events while passing all four protection checks.
  if (SITE_ROLES.get(siteId) === 'clean' || SITE_ROLES.get(siteId) === 'watchful') continue;

  const recs = recsBySite.get(siteId);
  const ids = recs.map(r => r.node.id);
  const residential = recs.some(r => r.node.system?.residential);
  // floor() keeps a 2-system site at 1 and a 3-system site at 1 rather than
  // rounding past the owner's ceiling.
  const faultBudget = residential
    ? Math.min(Math.floor(ids.length / 2), RESIDENTIAL_FAULT_CAP)
    : Math.floor(ids.length / 2);

  /* WHICH systems are troubled still starts from the web's own error flag
     (`systemErrorKind` — generateBadges.blue), so the fleet keeps the shape
     upstream gave it; the hash only breaks ties and tops the budget up when the
     flag has marked fewer than the site can carry. */
  const flagged = new Set(
    ids.filter(id => systemErrorKind(id, recOf.get(id).node.system?.waterSystemId ?? null) !== null),
  );
  const chosen = residential
    // The apartments that already have an event — see RESIDENTIAL_FAULT_CAP.
    ? ids.filter(id => systemEventType(id) !== 'none').slice(0, faultBudget)
    : [
        ...rankByHash(ids.filter(id => flagged.has(id)), 'fault'),
        ...rankByHash(ids.filter(id => !flagged.has(id)), 'fault'),
      ].slice(0, faultBudget);

  (residential ? troubledResidential : troubledOffice).push(...chosen);
}

// ── Phase 2: which dimension each troubled system fails ──────────────────────
/** systemId → 'comm' | 'valve' | 'power' | 'recipients' */
const kinds = new Map();

// Residential apartments fail on recipients only — see RESIDENTIAL_FAULT_CAP.
for (const id of troubledResidential) kinds.set(id, 'recipients');

/* The office systems are dealt the four kinds round-robin across the WHOLE
   fleet, not per site.

   Per-site dealing is what the first version did, and it lost a dimension: a
   5-system site nominates only 2 troubled systems, so each site handed out 2 of
   the 4 kinds, `valve` has to go to a system that actually has one (20 of the
   53 CRM systems are metering-only), and across six problem sites that landed
   on zero valve errors fleet-wide — an issue pill stuck at 0 and a whole alert
   type unreachable. Dealing fleet-wide makes the four pills balanced by
   construction, and the deal order is hashed so the kinds still scatter across
   sites rather than arriving in blocks.

   Kind-first, not system-first: each kind picks the first system that can carry
   it, so a run of valveless systems delays `valve` by one seat instead of
   dropping it. Taking each system's own `systemErrorKind` instead would leave
   "Missing recipients" permanently at zero — it is not one of the three kinds
   that function returns. */
const deck = rankByHash(troubledOffice, 'deal');
for (let turn = 0; deck.length > 0; turn++) {
  const kind = PROTECTION_KINDS[turn % PROTECTION_KINDS.length];
  const at = deck.findIndex(id => kind !== 'valve' || hasValveOf(id));
  // Only `valve` can fail to find a taker, and the three other kinds always
  // consume one, so the loop always terminates.
  if (at === -1) continue;
  kinds.set(deck[at], kind);
  deck.splice(at, 1);
}

// ── Phase 3: water events ────────────────────────────────────────────────────
/** systemId → { kind, leak } — the decided state, read by the builder below. */
const plan = new Map();

for (const siteId of siteOrder) {
  const ids = recsBySite.get(siteId).map(r => r.node.id);

  if (CLEAN_SITE_IDS.has(siteId)) {
    for (const id of ids) plan.set(id, { kind: null, leak: null });
    continue;
  }

  const residential = recsBySite.get(siteId).some(r => r.node.system?.residential);

  /* Water events are drawn SEPARATELY from faults, and overlap them only
     incidentally. "Health is errors. Water events are not health" — owner,
     2026-10-21 — so a system with an active event and no fault reads 100%
     healthy, and healthIsNotWaterEvents.dom.test.jsx asserts the dataset still
     contains that case. Confining events to the faulted set would delete it.

     THE CAP IS 20% OF THE SITE, floor. Owner, 2026-10-24: "not more than 20%
     of systems with active water events", in any location. It replaces a
     ceil(n/2) budget whose comment argued the 50% ceiling should not bind
     events at all — that argument is simply overruled.

     FLOOR, not round, and the choice is forced rather than preferred:
     round(4 * 0.2) is 1, which puts a 4-system site at 25% and breaks the
     rule in the owner's own words. Floor is the only reading that cannot
     exceed 20%. On today's dataset the two spellings differ nowhere — the
     only sites where they would are 45 Cedarline, 510 Lakeview and the
     unassigned group, and all three carry zero events.

     What this costs, said plainly: a site under 5 systems now gets NO water
     event, because floor(4 * 0.2) is 0. 30 Dogwood Dr (2 systems) can no
     longer show one. The old ceil existed precisely so a small problem site
     still got one, and that is the intent being given up here. The ten-unit
     residential buildings are untouched — floor(10 * 0.2) is 2, which is
     exactly the Apartment 2 / Apartment 5 parity pair the branch below
     preserves. */
  // `faulted` is the quadrant with issues and NO water event, so it spends none.
  const eventBudget =
    SITE_ROLES.get(siteId) === 'faulted' ? 0 : Math.floor(ids.length * WATER_EVENT_SITE_CAP);
  /* ONE event goes on top of an already-faulted system; the rest go to clear
     ones. Both halves of that are load-bearing.

     `buildEventFor` gives a leak priority over a device fault, so an event landing
     on a faulted system HIDES that system's Offline / Valve error / AC Power
     Lost card. Sending every event to a faulted system would make three of the
     five alert types unreachable; sending none there would delete the
     leak-over-fault case the UI has to draw (and the LOW_FLOW_VALVE_ERROR
     fixture with it). One slot, by FAULT_EVENT_PRIORITY, keeps both — and the
     clear systems take the remainder, which is where the owner's "100% healthy
     with an active water event" systems come from. */
  const priority = valveOverlapSpent ? FAULT_EVENT_PRIORITY_REST : FAULT_EVENT_PRIORITY_FIRST;
  const faultedForEvent = rankByHash(ids.filter(id => kinds.has(id)), 'event')
    .sort((a, b) => priority.indexOf(kinds.get(a)) - priority.indexOf(kinds.get(b)));
  if (eventBudget > 0 && kinds.get(faultedForEvent[0]) === 'valve') valveOverlapSpent = true;
  const clearForEvent = rankByHash(ids.filter(id => !kinds.has(id)), 'event');
  const eventIds = residential
    // Residential parity is exact and worth keeping: every building has
    // Apartment 2 on high flow and Apartment 5 on low. Already under budget.
    ? ids.filter(id => systemEventType(id) !== 'none').slice(0, eventBudget)
    : (faultedForEvent.length
        ? [faultedForEvent[0], ...clearForEvent, ...faultedForEvent.slice(1)]
        : clearForEvent
      ).slice(0, eventBudget);
  const events = new Set(eventIds);

  for (const id of ids) {
    const parityType = systemEventType(id);
    plan.set(id, {
      kind: kinds.get(id) ?? null,
      leak: !events.has(id)
        ? null
        // The web's own high/low verdict wherever it has one, so the two apps
        // still agree on severity for every system that leaks in both.
        : parityType !== 'none'
          ? parityType
          : mix32(stableHash(`etype:${id}`)) % 2 === 0 ? 'high' : 'low',
    });
  }
}

for (const rec of pending) {
  {
    const { node, l1, l2, l3, l4 } = rec;
    const id = node.id;
    const { kind, leak } = plan.get(id);
    const isResidential = Boolean(node.system?.residential);
    // Upstream CRM records a valve_type per system, and 20 of the 53 MRG
    // systems genuinely have none — they are metering-only. `valve: null` is
    // the app's existing representation for that (computeWidgets and the
    // valve tab both filter on it), so honour the upstream fact rather than
    // inventing a valve. Residential apartments are synthetic and all have one.
    const hasValve = isResidential || Boolean(node.system?.valveType);

    // One failed dimension at most per system — see PROTECTION_KINDS.
    const valve = !hasValve ? null : kind === 'valve' ? 'error' : derived(id, 'valve', BENIGN_VALVE);
    const comm = kind === 'comm' ? 'offline' : 'online';
    const power = kind === 'power' ? 'ac-lost' : derived(id, 'power', BENIGN_POWER);

    /* Built before the literal, not inside it, because the alert is a
       PROJECTION of it and both have to come from the one call. */
    const eventRecord = buildEventFor(id, leak, valve, comm, power);

    systems.push({
      id,
      account: node.system?.accountSfId || l4?.site?.accountSfId || ROOT_ACCOUNT_ID,
      name: node.name,

      l1: l1?.id ?? null, l1Name: l1?.name ?? null,
      l2: l2?.id ?? null, l2Name: l2?.name ?? null,
      l3: l3?.id ?? null, l3Name: l3?.name ?? null,
      l4: l4?.id ?? null, l4Name: l4?.name ?? null,

      // Street address of the leaf location, when upstream has one. The
      // Residential buildings carry real NYC addresses; the Office sites do
      // not (the CRM export has no street field), so those fall back to the
      // breadcrumb in `addressFor`.
      locationAddress: l4?.address ?? null,

      valve,
      comm,
      power,
      leak,
      offline: comm === 'offline',
      /* THE CANONICAL RECORD, carried on the system so every generator and
         every screen projects the same object instead of re-deriving one.
         Null when the system has nothing wrong with it. */
      event: eventRecord,
      alert: alertFromRecord(eventRecord),

      // Residential apartments are tenant systems — they get Home/Away mode.
      homeAway: isResidential,

      // Upstream identity, carried through so a system is addressable by the
      // same id in both apps and deep links can be compared directly.
      upstream: {
        salesforceId: node.system?.salesforceId ?? null,
        waterSystemId: node.system?.waterSystemId ?? null,
        siteSfId: node.system?.siteSfId ?? null,
        accountSfId: node.system?.accountSfId ?? null,
        active: node.system?.active ?? true,
        valveType: node.system?.valveType ?? null,
        meterType: node.system?.meterType ?? null,
        residential: isResidential,
      },
      resolvedIncident: cappedResolvedVariant(id),

      /* The fourth PRD 09 protection check, and the one that cannot pass by
         default: `computeSystemHealth` reads `(sys?.notificationRecipients || 0)
         > 0`, so an absent field is a FAILED check, not an unknown one. It used
         to be filled in only by the enrichment pass in src/data/systems.js,
         which drew it from its own `stableHash('recipients:'+id) % 17` — a draw
         that knew nothing about this site's clean/problem partition and could
         therefore plant a zero inside a site that is meant to be super healthy.
         That is precisely the independent-draw trap described above, so the
         count is decided HERE, with the other three dimensions, and systems.js
         now sizes its contact list to match rather than redrawing.
         1–3 recipients when the check passes: the same spread v1 used, which is
         what `generateEvents` prints as "N recipients notified". */
      notificationRecipients: kind === 'recipients' ? 0 : 1 + (mix32(stableHash(`recipients:${id}`)) % 3),
    });
  }
}

export const SYSTEMS_FROM_UPSTREAM = systems;

export const ACCOUNT_HIERARCHIES_FROM_UPSTREAM = {
  [ROOT_ACCOUNT_ID]: hierarchyRoots,
};

// ── Accounts ─────────────────────────────────────────────────────────────────
// Colour is presentational and has no upstream equivalent; assigned stably so
// a given account keeps its colour across rebuilds.
const ACCOUNT_COLORS = ['#04ADEF', '#7C3AED', '#DB4670', '#F05C25', '#A1D246', '#006340'];

function shortNameFor(name) {
  if (!name) return '';
  const cleaned = name.replace(/\s*\((.*?)\)\s*/g, ' ').trim();
  const paren = name.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  const words = cleaned.split(/\s+/);
  return words.length <= 2 ? cleaned : words.slice(0, 2).join(' ');
}

export const ACCOUNTS_FROM_UPSTREAM = snapshot.accounts.map(a => ({
  id: a.id,
  name: a.name,
  shortName: shortNameFor(a.name),
  industry: a.industry || a.type || '',
  color: ACCOUNT_COLORS[stableHash(a.id) % ACCOUNT_COLORS.length],
  parentId: a.parentId,
  // Upstream CRM carries no address/contact detail for these accounts. Left
  // empty rather than invented — the Info tab renders empty state for blanks.
  address: '',
  shippingAddress: '',
  contacts: [],
  notes: '',
  upstream: {
    status: a.status,
    type: a.type,
    region: a.region,
    numberOfActiveSites: a.numberOfActiveSites,
  },
}));

// ── Scopes (derived, not hand-maintained) ────────────────────────────────────
const systemsById = new Map(systems.map(s => [s.id, s]));

function collectSystems(node, acc = []) {
  if (node.type === 'system') {
    const s = systemsById.get(node.id);
    if (s) acc.push(s);
    return acc;
  }
  for (const child of node.children || []) collectSystems(child, acc);
  return acc;
}

const scopes = [
  {
    key: 'all',
    label: 'All locations',
    sub: `${systems.length} systems`,
    indent: 0,
    alerts: systems.filter(s => s.alert).length,
  },
];

function pushScopes(node, indent) {
  if (node.type === 'system') return;
  const under = collectSystems(node);
  const level = TYPE_FOR_DEPTH.indexOf(node.type) + 1;
  scopes.push({
    key: node.id,
    label: node.name,
    sub: `${under.length} system${under.length === 1 ? '' : 's'} · ${node.levelType} · L${level}`,
    indent,
    alerts: under.filter(s => s.alert).length,
  });
  for (const child of node.children || []) pushScopes(child, indent + 1);
}

for (const root of hierarchyRoots) pushScopes(root, 1);

export const SCOPES_FROM_UPSTREAM = scopes;
