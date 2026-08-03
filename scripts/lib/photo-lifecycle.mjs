export const PHOTO_BUCKETS = ['photos', 'photo-originals'];
export const STORAGE_REMOVE_LIMIT = 1000;

export function referencedPhotoPaths(photos, versions = []) {
  const paths = new Set();
  for (const photo of photos) {
    for (const key of ['display_path', 'thumb_path', 'original_path']) {
      if (typeof photo[key] === 'string' && photo[key]) paths.add(photo[key]);
    }
  }
  for (const version of versions) {
    if (typeof version.storage_path === 'string' && version.storage_path) {
      paths.add(version.storage_path);
    }
  }
  return paths;
}

function timestamp(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function isOlderThan(value, now, ageMs) {
  return timestamp(value) <= now.getTime() - ageMs;
}

export function chunked(values, size = STORAGE_REMOVE_LIMIT) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

export function planPhotoLifecycleCleanup({
  photos,
  versions = [],
  objectsByBucket,
  now = new Date(),
  incompleteDraftAgeHours = 24,
  orphanAgeHours = 24,
}) {
  const referenced = referencedPhotoPaths(photos, versions);
  const incompleteDraftAgeMs = incompleteDraftAgeHours * 60 * 60 * 1000;
  const orphanAgeMs = orphanAgeHours * 60 * 60 * 1000;

  const incompleteDraftIds = photos
    .filter((photo) => photo.status === 'draft')
    .filter(
      (photo) =>
        !photo.display_path && !photo.thumb_path && !photo.original_path
    )
    .filter((photo) => isOlderThan(photo.created_at, now, incompleteDraftAgeMs))
    .map((photo) => photo.id);

  const orphanObjects = {};
  for (const bucket of PHOTO_BUCKETS) {
    orphanObjects[bucket] = (objectsByBucket[bucket] ?? [])
      .filter((object) => !referenced.has(object.path))
      .filter((object) =>
        isOlderThan(object.updated_at ?? object.created_at, now, orphanAgeMs)
      )
      .map((object) => object.path)
      .sort();
  }

  return { incompleteDraftIds, orphanObjects };
}
