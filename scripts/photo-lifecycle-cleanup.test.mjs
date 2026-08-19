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

  it('yeniden kadraj sonrası boşta kalan eski versiyonlu thumb\'ı süpürür (C13)', () => {
    // Kullanıcı kadrajı değiştirdi: satır yeni thumb-<yeni>.jpg'ye bağlı,
    // eski thumb-<eski>.jpg artık referans değil → 24 saat sonra orphan.
    const plan = planPhotoLifecycleCleanup({
      now,
      photos: [
        {
          id: 'p',
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          display_path: 'u/p/display.jpg',
          thumb_path: 'u/p/thumb-yeni.jpg',
          original_path: null,
        },
      ],
      objectsByBucket: {
        photos: [
          { path: 'u/p/display.jpg', updated_at: '2026-08-01T10:00:00Z' },
          { path: 'u/p/thumb-yeni.jpg', updated_at: '2026-08-01T10:00:00Z' },
          { path: 'u/p/thumb-eski.jpg', updated_at: '2026-08-01T10:00:00Z' },
        ],
        'photo-originals': [],
      },
    });
    // Güncel thumb korunuyor, eski versiyon süpürülüyor.
    expect(plan.orphanObjects.photos).toEqual(['u/p/thumb-eski.jpg']);
  });

  /**
   * TÜREV TTL (X05). Sosyal çıktılar (feed/story) yeniden üretilebilir;
   * süresi dolduğunda GC topluyor. Referanslı olan türev, süresi dolsa
   * bile silinmiyor — süre "artık gerekmiyor" değil "yeniden
   * üretilebilir" demek.
   */
  it('süresi dolmuş türevi siler, süresi dolmamışı ve referanslıyı korur', () => {
    const plan = planPhotoLifecycleCleanup({
      now,
      photos: [
        {
          id: 'p',
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          display_path: 'u/p/display.jpg',
          thumb_path: 'u/p/thumb-abc.jpg',
          original_path: null,
        },
      ],
      derivatives: [
        // Süresi dolmuş sosyal çıktı → silinir.
        {
          storage_path: 'u/p/feed-1.jpg',
          bucket: 'photos',
          expires_at: '2026-08-02T00:00:00Z',
        },
        // Süresi dolmamış → korunur.
        {
          storage_path: 'u/p/story-1.jpg',
          bucket: 'photos',
          expires_at: '2026-09-01T00:00:00Z',
        },
        // Kalıcı (expires_at yok) → korunur.
        { storage_path: 'u/p/display.jpg', bucket: 'photos', expires_at: null },
        // Süresi dolmuş AMA hâlâ satırın thumb_path'i → korunur.
        {
          storage_path: 'u/p/thumb-abc.jpg',
          bucket: 'photos',
          expires_at: '2026-08-02T00:00:00Z',
        },
      ],
      objectsByBucket: {
        photos: [
          { path: 'u/p/display.jpg', updated_at: '2026-08-01T10:00:00Z' },
          { path: 'u/p/thumb-abc.jpg', updated_at: '2026-08-01T10:00:00Z' },
        ],
        'photo-originals': [],
      },
    });

    expect(plan.orphanObjects.photos).toEqual(['u/p/feed-1.jpg']);
    expect(plan.expiredDerivativeCount).toBe(1);
  });

  it('storage silme limitine göre parçalara böler', () => {
    expect(chunked(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });
});
