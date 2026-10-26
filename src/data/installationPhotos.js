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
 * Which system gets which photo is a pure function of the system id, through
 * the repo's own `stableHash`/`mix32`. No `Math.random()` anywhere: a reload
 * must not reshuffle the fleet.
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
 * `quota` is the percentage of that family that gets a photo. It is NOT 100
 * anywhere: a fleet where every system has a photo is less honest than a mix,
 * and "no pictures saved for this system yet" is a real state the panel has to
 * keep handling. Irrigation lines get none at all — none of the seven photos
 * shows an irrigation install, and inventing one would be the lie this file
 * exists to avoid.
 */
const FAMILIES = [
  // Fire protection — unmistakable, and only one photo shows it.
  { re: /fire/i, photos: [['fire-riser']], quota: 80 },

  // Mechanical plant: cooling towers, chillers, HVAC loops, boiler makeup.
  {
    re: /cooling tower|chiller|hvac|boiler/i,
    photos: [['hvac-plant-manifold']],
    quota: 65,
  },

  // Domestic / catering services. The two riser-cupboard frames are two shots
  // of ONE cupboard, so they are seeded together as a pair rather than being
  // split across two systems as if they were two different installs. They are
  // also the only multi-picture systems, which keeps the thumbnail grid's
  // wrapping exercised.
  {
    re: /domestic|kitchen|laundry/i,
    photos: [['riser-cupboard', 'riser-cupboard-wide']],
    quota: 70,
  },

  // Incoming mains, basement supplies and roof tank feeds — all plant-room
  // pipework on a backboard.
  {
    re: /main supply|basement supply|roof tank/i,
    photos: [['plant-room-wall']],
    quota: 60,
  },

  // Irrigation: deliberately none. See the note above.
  { re: /irrigation/i, photos: [], quota: 0 },

  // Residential apartments. Both frames are multi-dwelling riser/branch
  // cupboards, which is what an apartment's own system actually hangs off.
  // The quota is much lower here: 50 of the 103 systems are apartments, and
  // photographing every flat in a block is not something anyone does.
  {
    re: /apartment/i,
    photos: [['riser-cupboard-leds'], ['branch-manifold']],
    quota: 30,
  },
]

/* A fixed timestamp, not Date.now(): these are "already on file", and a seed
   whose addedAt moved every reload would sort differently on each render. */
const SEEDED_AT = '2025-06-17T19:16:00.000Z'

function photoIdsFor(systemId, name, alwaysCover) {
  const family = FAMILIES.find(f => f.re.test(name))
  if (!family || family.photos.length === 0) return []

  /* Coverage gate. Through mix32 so it does not correlate with the pick
     below — parity.js documents why two draws off the raw hash of the same id
     end up tied to each other. */
  if (!alwaysCover) {
    const gate = mix32(stableHash(`instphoto-gate:${systemId}`)) % 100
    if (gate >= family.quota) return []
  }

  const pick = mix32(stableHash(`instphoto-pick:${systemId}`)) % family.photos.length
  return family.photos[pick]
}

/* systemId -> [photoId]. Built once at module load.
 *
 * A system that carries an event skips the quota and is always covered, as
 * long as its family has a photo at all. Two reasons, and the first is the
 * one that matters:
 *
 *   · FindSystemPanel only EXISTS inside EventFocusOverlay, and the overlay is
 *     reached from the events list on HomeAllAccounts. So the systems a
 *     reviewer actually opens this panel on are, overwhelmingly, the ones with
 *     an event. Leaving those to a 60–70% dice roll meant 6 of the 13 showed
 *     the empty state on the only path most people will ever walk.
 *   · It is also the truthful direction. A system that has had a water event
 *     is precisely the system someone has been sent to go and look at, so it
 *     is MORE likely to have photographs on file, not less.
 *
 * The rule is "every event-carrying system in a family that HAS a photo", not
 * "every event-carrying system": an irrigation line would still show the empty
 * state with an event open, because no photo here shows an irrigation install.
 * As the dataset stands none of the 13 happens to be an irrigation line, so in
 * practice today all 13 do get one — stated plainly rather than left implied.
 * 50 of the 103 systems still have no photo at all, so the empty state is very
 * much a live state, reached from the systems list and the system page.
 */
const ASSIGNMENTS = new Map()
for (const s of SYSTEMS) {
  const ids = photoIdsFor(s.id, s.name || '', s.alert != null)
  if (ids.length) ASSIGNMENTS.set(s.id, ids)
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
