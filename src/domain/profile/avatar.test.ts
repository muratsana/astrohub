import { describe, expect, it } from 'vitest';
import {
  avatarSourceRect,
  avatarStoragePath,
  cleanAvatarCrop,
} from './avatar';

describe('avatar crop', () => {
  it('landscape görselde kare FOVu yatay eksende kaydırır', () => {
    expect(
      avatarSourceRect({ width: 4000, height: 2000 }, { zoom: 1, panX: 1, panY: 0 })
    ).toEqual({ x: 2000, y: 0, size: 2000 });
  });

  it('zoom arttıkça kaynak karesi küçülür', () => {
    expect(
      avatarSourceRect({ width: 3000, height: 3000 }, { zoom: 3, panX: 0, panY: 0 })
    ).toEqual({ x: 1000, y: 1000, size: 1000 });
  });

  it('geçersiz kontrolleri güvenli aralığa çeker', () => {
    expect(cleanAvatarCrop({ zoom: 99, panX: -4, panY: Number.NaN })).toEqual({
      zoom: 4,
      panX: -1,
      panY: 0,
    });
  });
});

describe('avatarStoragePath', () => {
  it('sahipliği yolun ilk klasöründe tutar', () => {
    expect(avatarStoragePath('u1', 123)).toBe('u1/avatar-123.jpg');
  });
});
