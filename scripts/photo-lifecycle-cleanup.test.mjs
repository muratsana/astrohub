import { describe, expect, it } from 'vitest';
import {
  chunked,
  planPhotoLifecycleCleanup,
  referencedPhotoPaths,
} from './lib/photo-lifecycle.mjs';

const now = new Date('2026-08-03T12:00:00Z');

describe('photo lifecycle cleanup plan', () => {
  it('fotoğraf ve sürüm yollarını canlı referans kabul eder', () => {
    const paths = referencedPhotoPaths(
      [
        {
          display_path: 'u/p/display.jpg',
          thumb_path: 'u/p/thumb.jpg',
          original_path: 'u/p/original.tif',
        },
      ],
      [{ storage_path: 'u/p/versions/v1.jpg' }]
    );

    expect([...paths].sort()).toEqual([
      'u/p/display.jpg',
      'u/p/original.tif',
      'u/p/thumb.jpg',
      'u/p/versions/v1.jpg',
    ]);
  });

  it('24 saatten eski görselsiz taslakları ve eski orphan nesneleri seçer', () => {
    const plan = planPhotoLifecycleCleanup({
      now,
      photos: [
        {
          id: 'old-empty-draft',
          status: 'draft',
          created_at: '2026-08-01T10:00:00Z',
          display_path: null,
          thumb_path: null,
          original_path: null,
        },
        {
          id: 'new-empty-draft',
          status: 'draft',
          created_at: '2026-08-03T10:00:00Z',
          display_path: null,
          thumb_path: null,
          original_path: null,
        },
        {
          id: 'published',
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          display_path: 'u/p/display.jpg',
          thumb_path: 'u/p/thumb.jpg',
          original_path: null,
        },
      ],
      versions: [{ storage_path: 'u/p/v1.jpg' }],
      objectsByBucket: {
        photos: [
          { path: 'u/p/display.jpg', updated_at: '2026-08-01T10:00:00Z' },
          { path: 'u/p/v1.jpg', updated_at: '2026-08-01T10:00:00Z' },
          { path: 'u/orphan.jpg', updated_at: '2026-08-01T10:00:00Z' },
          { path: 'u/new-orphan.jpg', updated_at: '2026-08-03T11:00:00Z' },
        ],
        'photo-originals': [
          { path: 'u/original-orphan.tif', updated_at: '2026-08-01T10:00:00Z' },
        ],
      },
    });

    expect(plan.incompleteDraftIds).toEqual(['old-empty-draft']);
    expect(plan.orphanObjects).toEqual({
      photos: ['u/orphan.jpg'],
      'photo-originals': ['u/original-orphan.tif'],
    });
  });

  it('storage silme limitine göre parçalara böler', () => {
    expect(chunked(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });
});
