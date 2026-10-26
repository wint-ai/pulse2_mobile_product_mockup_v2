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
//
// ── SEEDED INSTALLATION PHOTOS vs THE USER'S OWN ────────────────────────
// Systems also carry real installation photographs out of the box (see
// installationPhotos.js). Those are NEVER written to localStorage. They are
// merged in on read, ahead of whatever the user has added:
//
//   getPictures()  =  [ seeds the user has not deleted ] ++ [ user pictures ]
//
// Keeping the two apart is what stops them clobbering each other. If seeds
// were written into the stored array on first read, a later change to the
// seed set would either be invisible on a browser that had already read it
// or, if it re-seeded, would duplicate or delete rows the user had curated.
// Keeping them out means addPicture() only ever appends to the user's own
// list and cannot disturb a seed, and re-seeding cannot touch a user row.
//
// Deleting a seed therefore cannot be a splice — there is nothing stored to
// splice out — so it records a TOMBSTONE in `removedSeeds` instead. The user
// can delete a seeded photo and have it stay deleted across reloads, which is
// the behaviour the X button already promises on every other picture.

import { getSeededPictures, isSeededPictureId } from './installationPhotos';

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
export function getPictures(scopeId) {
  const obj = read(scopeId);
  const mine = Array.isArray(obj.pictures) ? obj.pictures : [];
  const dropped = Array.isArray(obj.removedSeeds) ? obj.removedSeeds : [];
  const seeds = getSeededPictures(scopeId).filter(p => !dropped.includes(p.id));
  return [...seeds, ...mine];
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
  if (isSeededPictureId(pictureId)) {
    // A seed is not in the stored array, so there is nothing to filter out.
    // Record that the user dismissed it; getPictures() honours the tombstone.
    const dropped = Array.isArray(obj.removedSeeds) ? obj.removedSeeds : [];
    if (!dropped.includes(pictureId)) dropped.push(pictureId);
    obj.removedSeeds = dropped;
  } else {
    obj.pictures = (obj.pictures || []).filter(p => p.id !== pictureId);
  }
  write(scopeId, obj);
}
