import { describe, expect, it } from 'vitest';
import {
  AVATAR_HEDEF,
  BANNER_ASPECT,
  BANNER_HEDEF,
  avatarStoragePath,
  bannerStoragePath,
} from './avatar';

/**
 * Kadraj hesabının kendisi `kadraj.test.ts` içinde ölçülüyor; burada
 * kalan şey depolama yolu ve hedef ölçüler — ikisi de sessizce
 * bozulabilecek türden.
 */
describe('depolama yolu', () => {
  /* Sahiplik yolun İLK klasöründe: depolama politikası
     `(storage.foldername(name))[1] = auth.uid()` diyor. Yolun başına
     başka bir şey gelirse kullanıcı kendi dosyasını yazamaz. */
  it('sahipliği yolun ilk klasöründe tutuyor', () => {
    expect(avatarStoragePath('u1', 123)).toBe('u1/avatar-123.jpg');
    expect(bannerStoragePath('u1', 123)).toBe('u1/banner-123.jpg');
  });

  /* Avatar ve kapak AYNI kovada duruyor; adları çakışırsa biri
     diğerinin üstüne yazardı. */
  it('avatar ve kapak farklı ad alıyor', () => {
    expect(avatarStoragePath('u1', 5)).not.toBe(bannerStoragePath('u1', 5));
  });

  /* Zaman damgası olmasaydı aynı ada üstüne yazılır, tarayıcı ve CDN
     önbelleğinde eski görsel kalırdı. */
  it('zaman damgası yolu değiştiriyor', () => {
    expect(avatarStoragePath('u1', 1)).not.toBe(avatarStoragePath('u1', 2));
  });
});

describe('hedef ölçüler', () => {
  it('avatar kare, kapak 3:1', () => {
    expect(AVATAR_HEDEF.width).toBe(AVATAR_HEDEF.height);
    expect(BANNER_ASPECT).toBe(3);
    expect(BANNER_HEDEF.width / BANNER_HEDEF.height).toBe(BANNER_ASPECT);
  });

  it('ikisi de 5 MB sınırında', () => {
    expect(AVATAR_HEDEF.maxBytes).toBe(5 * 1024 * 1024);
    expect(BANNER_HEDEF.maxBytes).toBe(5 * 1024 * 1024);
  });
});
