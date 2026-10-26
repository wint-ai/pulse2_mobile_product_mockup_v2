/**
 * installationPhotos.js — the seeded "what this install actually looks like"
 * photographs behind FindSystemPanel's Site pictures and InfoAccordion's
 * Pictures section.
 *
 * WHY THIS EXISTS
 * `FindSystemPanel` (EventFocusOverlay) promises to help a user FIND the
 * system — "the device photo, where it is, what it is, and the pictures and
 * notes a user has saved against this system". Nothing seeded those pictures,
 * so the panel showed the generic product shot and the words "No pictures
 * saved for this system yet" on every one of the 103 systems. These seven
 * photographs are real WINT installations supplied by the owner.
 *
 * WHAT THESE PICTURES ARE, AND WHAT WAS DONE TO THEM
 * They are photographs of REAL customer sites and this repo is public, so each
 * one was re-encoded from scratch (resize to 800px on the long edge, JPEG q82,
 * progressive) through a bare RGB buffer that carries no `info` dict. The
 * output files hold one 16-byte JFIF density segment and nothing else: no
 * EXIF, no GPS, no XMP, no IPTC, no ICC, no maker note. Verified by segment
 * walk, not assumed. 2.30 MB of source became 638 KB.
 *
 * They live in `src/assets/` rather than `public/` because they are referenced
 * by ESM import and drawn by <img>, exactly like `avatar.jpg` and
 * `wint-vma-front.png`. `public/pipes1.jpg` is the other pattern, and it earns
 * `public/` by being built into a CSS `url()` from a BASE_URL string, where a
 * hashed name would not work. Ours are not, so they take the bundled, hashed,
 * build-time-checked path.
 *
 * DETERMINISM
 * Which system gets which photos, and HOW MANY of them, is a pure function of
 * the system id, through the repo's own `stableHash`/`mix32`. No
 * `Math.random()` anywhere: a reload must not reshuffle the fleet, and a
 * thumbnail grid that was three wide on one render and one wide on the next
 * would make every screenshot of this app disagree with the last.
 */
import { stableHash, mix32 } from './upstream/parity'
import { SYSTEMS } from './systems'

import plantRoomWall from '@/assets/installations/plant-room-wall.jpg'
import riserCupboard from '@/assets/installations/riser-cupboard.jpg'
import riserCupboardWide from '@/assets/installations/riser-cupboard-wide.jpg'
import fireRiser from '@/assets/installations/fire-riser.jpg'
import hvacPlantManifold from '@/assets/installations/hvac-plant-manifold.jpg'
import branchManifold from '@/assets/installations/branch-manifold.jpg'
import riserCupboardLeds from '@/assets/installations/riser-cupboard-leds.jpg'

/**
 * The catalogue. `alt` describes what is in the frame, because a photograph
 * whose whole job is "help me find this thing" is useless to a screen-reader
 * user as `alt=""`.
 */
export const INSTALLATION_PHOTOS = {
  'plant-room-wall': {
    url: plantRoomWall,
    alt: 'WINT unit on a plywood-lined plant room wall, beside a blue inline water meter, lever ball valves and an orange actuator',
  },
  'riser-cupboard': {
    url: riserCupboard,
    alt: 'Riser cupboard with B.C.W.S. labelled risers, copper pipework, a WINT unit and a blue inline meter',
  },
  'riser-cupboard-wide': {
    url: riserCupboardWide,
    alt: 'Wider view of the same riser cupboard, showing the actuator, meter and isolation valves on the cold water branch',
  },
  'fire-riser': {
    url: fireRiser,
    alt: 'Fire service riser in a basement: red grooved pipework, grooved couplings and an Arad Octave meter on the blue body',
  },
  'hvac-plant-manifold': {
    url: hvacPlantManifold,
    alt: 'HVAC plant room manifold — copper heating and chilled headers on a steel frame with orange actuators, inline meters and a blue pump set',
  },
  'branch-manifold': {
    url: branchManifold,
    alt: 'Wall-mounted branch manifold: blue risers feeding four metered take-offs, with a WINT unit above',
  },
  'riser-cupboard-leds': {
    url: riserCupboardLeds,
    alt: 'Floor riser cupboard holding a dozen insulated risers, each with a valve, a meter and a WINT unit showing a lit status LED',
  },
}

/**
 * WHICH PHOTO SUITS WHICH SYSTEM.
 *
 * The match has to be on something real, and the only field that actually
 * carries the kind of line a system is, is its NAME — "Fire Line — Wing N",
 * "Cooling Tower Makeup", "Domestic Cold Water — Zone 2". `systemTypeOf()`
 * reports FLOW for all 103 (its own header says the dataset carries nothing
 * else) and `getSystemSpecs().monitoredEnvironment` matches on id prefixes
 * (`ct_`, `dhw_`, `f12_`) that this dataset's `ws-9623` / `esrt-bldg-A-apt-4`
 * ids do not have, so it answers "General water supply" for every system.
 * Neither can tell a fire main from a kitchen feed. The name can.
 *
 * This matters because the fire-riser photograph on a "Domestic Cold Water"
 * system is visibly wrong to anyone who knows the product, and a mockup that
 * is visibly wrong about the product is worse than one that shows nothing.
 *
 * COVERAGE IS TOTAL. Every system gets between one and three pictures.
 *
 * It did not used to be. Each family carried a `quota` — the percentage of
 * that family that got a picture — so 53 of the 103 were covered and "No
 * pictures saved for this system yet" stayed a reachable state. The owner
 * ruled against that on 2026-10-26, looking at his own "Cooling Tower Makeup
 * — Zone 5" at 240 Harborview Ave: "why i still dont see installation pics
 * here / 1-3 for each system /event". The quota is gone. There is no path
 * through `photoIdsFor` that returns an empty list, including for a name no
 * family matches — `FALLBACK` catches that rather than letting a future
 * rename reintroduce the empty state silently.
 *
 * `primary` is the family-correct picture and is picked first. `extras` are
 * the looser second and third, drawn only from frames that are at least
 * plausible on that family — which is why `fire-riser` appears in exactly one
 * family and nowhere else. A fire riser behind a kitchen feed is the specific
 * wrongness this structure exists to prevent, and widening coverage is not a
 * reason to stop preventing it.
 */

/**
 * `riser-cupboard` and `riser-cupboard-wide` are two angles of ONE cupboard,
 * not two installs. Whenever the first is a system's primary and that system
 * is getting more than one picture, the second follows it — but only then.
 * The pair does not pin the count: a domestic system drawn at 1 shows the
 * close shot alone, and one drawn at 3 shows both plus an extra.
 *
 * `riser-cupboard-wide` is therefore deliberately absent from every `primary`
 * and `extras` list below: the wide frame never appears without the close one
 * it belongs to.
 */
const PAIRED_WITH = {
  'riser-cupboard': 'riser-cupboard-wide',
}

const FAMILIES = [
  // Fire protection — unmistakable, and only one photo shows it. The extras
  // are the plant-room context a riser sits in, never another service's
  // cupboard.
  {
    re: /fire/i,
    primary: ['fire-riser'],
    extras: ['plant-room-wall', 'branch-manifold'],
  },

  // Mechanical plant: cooling towers, chillers, HVAC loops, boiler makeup.
  {
    re: /cooling tower|chiller|hvac|boiler/i,
    primary: ['hvac-plant-manifold'],
    extras: ['plant-room-wall', 'branch-manifold'],
  },

  // Domestic / catering services. Two primaries rather than one so thirteen
  // systems do not all open on the same frame.
  {
    re: /domestic|kitchen|laundry/i,
    primary: ['riser-cupboard', 'riser-cupboard-leds'],
    extras: ['branch-manifold', 'plant-room-wall'],
  },

  // Incoming mains, basement supplies and roof tank feeds — all plant-room
  // pipework on a backboard.
  {
    re: /main supply|basement supply|roof tank/i,
    primary: ['plant-room-wall'],
    extras: ['branch-manifold', 'riser-cupboard-leds'],
  },

  /* IRRIGATION — THESE ARE STAND-INS. READ THIS BEFORE TRUSTING THEM.
     None of the seven photographs shows an irrigation install. This family
     used to be seeded with nothing at all for exactly that reason. Coverage
     is now total by the owner's instruction, so the choice is not "right
     picture or none" but "least wrong picture", and the two frames here are
     the two an irrigation feed could plausibly look like: `branch-manifold`
     is a wall-mounted manifold feeding four metered take-offs, which is the
     shape an irrigation zone header actually has, and `plant-room-wall` is a
     generic metered take-off on a backboard.
     `fire-riser` and the residential riser cupboards are NOT here and must
     not be added — those are identifiably some other service.
     Nobody should cite an irrigation system's pictures as evidence of what a
     WINT irrigation install looks like. They are furniture for the mockup.
     The fix, when it matters, is a real irrigation photograph in
     `src/assets/installations/`, not a different stand-in. Capped at two by
     having only one extra: there is no third frame honest enough to use. */
  {
    re: /irrigation/i,
    primary: ['branch-manifold'],
    extras: ['plant-room-wall'],
  },

  // Residential apartments — 50 of the 103, so this family needs the most
  // internal variety or half the fleet opens on one frame. Three primaries
  // and three extras, all of them multi-dwelling riser/branch cupboards or
  // the backboard such a branch comes off.
  {
    re: /apartment/i,
    primary: ['riser-cupboard-leds', 'branch-manifold', 'riser-cupboard'],
    extras: ['branch-manifold', 'riser-cupboard-leds', 'plant-room-wall'],
  },
]

/* The name no family matched. Today every one of the 103 matches a family
   above, so this is unreachable — and it is here so that it STAYS
   unreachable-but-harmless. A renamed or newly synced system that fell
   through would otherwise hit `find() === undefined` and show the empty state
   the owner just ruled out, on a screen nobody would think to re-check.
   Deliberately generic: a plant-room backboard and a branch manifold say
   almost nothing about which service they are on, which is the right thing to
   say about a system we cannot classify. */
const FALLBACK = {
  primary: ['plant-room-wall'],
  extras: ['branch-manifold', 'riser-cupboard-leds'],
}

/* A fixed timestamp, not Date.now(): these are "already on file", and a seed
   whose addedAt moved every reload would sort differently on each render. */
const SEEDED_AT = '2025-06-17T19:16:00.000Z'

/* Each draw goes through mix32 under its OWN prefix. parity.js explains why:
   `stableHash` is h*31 + c, so hashing a prefixed string shifts the result by
   a CONSTANT for a given modulus — two raw-hash draws off the same id end up
   tied to each other. Here that would have meant the count deciding the
   primary, i.e. every three-picture system in a family opening on the same
   frame. */
function draw(systemId, salt, n) {
  return n > 0 ? mix32(stableHash(`instphoto-${salt}:${systemId}`)) % n : 0
}

/**
 * The pictures for one system: never fewer than one, never more than three,
 * never the same frame twice.
 *
 * The count is drawn flat over 1..3 so all three thumbnail-grid widths get
 * exercised. It is a ceiling, not a promise: a family with a small honest
 * pool (irrigation) tops out below it rather than padding with a frame that
 * would be a lie.
 *
 * `extras` is read from a ROTATING start rather than from index 0. Without
 * that, every two-picture apartment in a block showed the identical pair and
 * the list read as wallpaper — the count varied but the combination did not.
 */
function photoIdsFor(systemId, name) {
  const family = FAMILIES.find(f => f.re.test(name)) ?? FALLBACK

  const primary = family.primary[draw(systemId, 'pick', family.primary.length)]
  const want = 1 + draw(systemId, 'count', 3)
  const out = [primary]
  if (out.length >= want) return out

  const mate = PAIRED_WITH[primary]
  if (mate && !out.includes(mate)) out.push(mate)

  const pool = family.extras.filter(p => !out.includes(p))
  const start = draw(systemId, 'rot', pool.length)
  for (let i = 0; i < pool.length && out.length < want; i++) {
    const candidate = pool[(start + i) % pool.length]
    if (!out.includes(candidate)) out.push(candidate)
  }

  return out.slice(0, want)
}

/* systemId -> [photoId]. Built once at module load.
 *
 * Every system in SYSTEMS is in this map, and every entry holds 1-3 ids. The
 * old version skipped systems whose quota roll failed and carried a long note
 * about why event-carrying systems were exempted from that roll; both are
 * moot now that the roll is gone.
 *
 * Events are covered by construction, not by a second rule. `FindSystemPanel`
 * exists only inside `EventFocusOverlay`, and both of the overlay's callers
 * hand it a system id — HomeAllAccounts maps its `waterEvents` rows straight
 * off `s.id`, and SystemPageV2Screen passes `system.id`. There is no
 * event-only scope id for a seed to miss.
 */
const ASSIGNMENTS = new Map()
for (const s of SYSTEMS) {
  ASSIGNMENTS.set(s.id, photoIdsFor(s.id, s.name || ''))
}

/**
 * The seeded pictures for a scope, in `locationInfoStore`'s own record shape
 * so every surface that already renders a picture renders these unchanged.
 *
 * Returns [] for anything that is not a system id — `locationInfoStore` is
 * also keyed by account and location ids on the v1 Home Info tab, and those
 * scopes have no installation photo of their own.
 *
 * `dataUrl` holds a bundled asset URL rather than a base64 data URL. The field
 * name is the store's, and every consumer only ever feeds it to <img src>, so
 * a URL is exactly as valid there as a data URL — and it keeps 638 KB of
 * photographs out of localStorage, which the store's own write() warns can
 * throw QuotaExceededError on large images.
 *
 * NOTHING HERE IS WRITTEN TO localStorage. `locationInfoStore.getPictures`
 * merges these in on READ and tombstones a dismissed one by id. That is what
 * lets this file's seed set change — as it just did, from 53 systems to all
 * 103 — and have the change show up on a browser that already holds a stored
 * record for that scope. Persisting the seeds would freeze them.
 */
export function getSeededPictures(scopeId) {
  const ids = ASSIGNMENTS.get(scopeId)
  if (!ids) return []
  return ids.map(photoId => ({
    id: `seed-${photoId}`,
    dataUrl: INSTALLATION_PHOTOS[photoId].url,
    alt: INSTALLATION_PHOTOS[photoId].alt,
    addedAt: SEEDED_AT,
    seeded: true,
  }))
}

/** True for the ids getSeededPictures mints, so the store can tombstone them. */
export function isSeededPictureId(pictureId) {
  return typeof pictureId === 'string' && pictureId.startsWith('seed-')
}

/** Test/diagnostic hook: how many systems ended up with photographs. */
export function seededSystemCount() {
  return ASSIGNMENTS.size
}

/** Test/diagnostic hook: the photo ids for one system, without the record shape. */
export function seededPhotoIdsFor(systemId) {
  return ASSIGNMENTS.get(systemId) ?? []
}
