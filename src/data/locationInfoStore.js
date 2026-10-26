// Local store for user-edited Location Info fields on the Home Info tab.
// Two surfaces are user-editable per scope:
//   • notes     — freeform text override
//   • pictures  — list of { id, dataUrl, addedAt } site photos
//
// Mockup persistence only: data lives in localStorage under one key per
// account/scope id. Each account starts seeded from accounts.js so static
// mock data still shows; once the user edits, the localStorage override
// wins. Clearing localStorage restores the mock defaults.
//
// In a real product these would be server-side fields on the location
// record, with image uploads going to object storage instead of being
// inlined as data URLs.

import installRiserWall from '@/assets/site/install-riser-wall.jpg';
import installPlantRoom from '@/assets/site/install-plant-room.jpg';
import installFireRiser from '@/assets/site/install-fire-riser.jpg';

const KEY_PREFIX = 'pulse2-location-info:';

function keyFor(scopeId) { return `${KEY_PREFIX}${scopeId}`; }

function read(scopeId) {
  if (!scopeId) return {};
  try {
    const raw = localStorage.getItem(keyFor(scopeId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(scopeId, obj) {
  if (!scopeId) return;
  try {
    localStorage.setItem(keyFor(scopeId), JSON.stringify(obj));
  } catch (err) {
    // localStorage can throw QuotaExceededError when images are large.
    // We deliberately don't surface this — it's a mockup constraint.
    console.warn('[locationInfoStore] write failed', err);
  }
}

// ── Notes ────────────────────────────────────────────────────────────────
export function getNotesOverride(scopeId) {
  const v = read(scopeId).notes;
  return typeof v === 'string' ? v : null;   // null = no override, use mock default
}

export function setNotes(scopeId, notes) {
  const obj = read(scopeId);
  obj.notes = String(notes ?? '');
  write(scopeId, obj);
}

// ── Pictures ─────────────────────────────────────────────────────────────
/* SEED. Owner, 2026-10-26: "why still no pictures here?" — because nothing
   ever put any there. The store is user-written and starts empty, so the
   gallery correctly reported "no pictures saved" on every system, forever,
   and the feature could not be seen at all.
 *
 * Seeding is this file's own pattern (see the header: "Each account starts
 * seeded from accounts.js"). The photo is the real VMA front shot already in
 * the repo — a picture of the installed unit is exactly what a site picture
 * is for, which is why it is the one asset here that fits.
 *
 * It yields to real data: the moment a scope has saved pictures of its own,
 * the seed is not consulted. `seeded: true` marks it so a caller can tell a
 * demo photo from one somebody took. */
const SEED_PICTURES = [
  { id: 'seed-riser-wall', dataUrl: installRiserWall, addedAt: null, seeded: true },
  { id: 'seed-plant-room', dataUrl: installPlantRoom, addedAt: null, seeded: true },
  { id: 'seed-fire-riser', dataUrl: installFireRiser, addedAt: null, seeded: true },
];

/* EVERY SCOPE GETS THEM. This was gated on a hash so the empty state stayed
   reachable, which was the right instinct and the wrong call: owner,
   2026-10-26, "make sure for ALL systems we have photos and notes that help
   find the systems." Finding the unit is the job; a system with no photo
   fails at it. The empty branch below still runs for a scope id that is not a
   system (the picker's own tests use one), so the component's empty state is
   still exercised — it is just not something the fleet can be in. */
export function getPictures(scopeId) {
  const v = read(scopeId).pictures;
  if (Array.isArray(v) && v.length) return v;
  return String(scopeId ?? '') ? SEED_PICTURES : [];
}

export function addPicture(scopeId, dataUrl) {
  const obj = read(scopeId);
  const list = Array.isArray(obj.pictures) ? obj.pictures : [];
  list.push({
    id: `pic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dataUrl,
    addedAt: new Date().toISOString(),
  });
  obj.pictures = list;
  write(scopeId, obj);
}

export function removePicture(scopeId, pictureId) {
  const obj = read(scopeId);
  obj.pictures = (obj.pictures || []).filter(p => p.id !== pictureId);
  write(scopeId, obj);
}
