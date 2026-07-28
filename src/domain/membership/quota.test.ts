import { describe, it, expect } from 'vitest';
import {
  canPublishPhoto,
  canCreateDraft,
  remainingPhotoQuota,
  formatQuotaLabel,
  quotaFullMessage,
  checkUploadSize,
  formatBytes,
  PHOTO_LIMITS,
  MAX_DRAFT_PHOTOS,
  MAX_UPLOAD_BYTES,
  DIRECT_UPLOAD_BYTES,
} from './quota';

describe('kademeye göre fotoğraf kotası', () => {
  it('standart üyelik üç fotoğrafta durur', () => {
    expect(
      canPublishPhoto({ activePublished: 2, drafts: 0, tier: 'standart' })
    ).toBe(true);
    expect(
      canPublishPhoto({ activePublished: 3, drafts: 0, tier: 'standart' })
    ).toBe(false);
  });

  it('premium üyelik ellide durur', () => {
    expect(
      canPublishPhoto({ activePublished: 49, drafts: 0, tier: 'premium' })
    ).toBe(true);
    expect(
      canPublishPhoto({
        activePublished: PHOTO_LIMITS.premium,
        drafts: 0,
        tier: 'premium',
      })
    ).toBe(false);
  });

  /*
   * Kademe bilinmiyorsa en kısıtlı olan geçerli. Tersi — bilinmeyeni
   * premium saymak — kota kontrolünü bir veri eksikliğiyle atlatılabilir
   * hâle getirirdi.
   */
  it('kademe verilmezse standart kabul eder', () => {
    expect(canPublishPhoto({ activePublished: 3, drafts: 0 })).toBe(false);
    expect(remainingPhotoQuota({ activePublished: 1, drafts: 0 })).toBe(2);
  });

  it('taslak sınırı kademeden bağımsız', () => {
    expect(
      canCreateDraft({ activePublished: 0, drafts: MAX_DRAFT_PHOTOS })
    ).toBe(false);
    expect(canCreateDraft({ activePublished: 0, drafts: 3 })).toBe(true);
  });

  it('kalan kota negatife düşmez', () => {
    expect(
      remainingPhotoQuota({ activePublished: 60, drafts: 0, tier: 'premium' })
    ).toBe(0);
  });

  it('panel etiketi kademeyi yansıtır', () => {
    expect(formatQuotaLabel(2, 'standart')).toBe('2 / 3');
    expect(formatQuotaLabel(34, 'premium')).toBe('34 / 50');
  });
});

describe('kota dolu mesajı', () => {
  it('standart kullanıcıya premium seçeneğinden söz eder', () => {
    expect(quotaFullMessage('standart')).toContain('premium');
  });

  it('premium kullanıcıya yükseltme önermez — çıkışı arşivlemek', () => {
    const message = quotaFullMessage('premium');
    expect(message).not.toContain('premium üyelikte bu sınır');
    expect(message).toContain('arşivleyin');
  });
});

describe('dosya boyutu kararı', () => {
  it('küçük dosyayı olduğu gibi kabul eder', () => {
    expect(checkUploadSize(2 * 1024 * 1024).kind).toBe('ok');
  });

  it('8 MB üstünü küçülterek kabul eder — reddetmez', () => {
    const verdict = checkUploadSize(DIRECT_UPLOAD_BYTES + 1);
    expect(verdict.kind).toBe('optimize');
    if (verdict.kind === 'optimize') {
      expect(verdict.reason).toContain('küçültülecek');
      // Kullanıcı orijinalinin kaybolmadığını bilmeli.
      expect(verdict.reason).toContain('Orijinal');
    }
  });

  it('50 MB üstünü reddeder ve ne yapılacağını söyler', () => {
    const verdict = checkUploadSize(MAX_UPLOAD_BYTES + 1);
    expect(verdict.kind).toBe('reject');
    if (verdict.kind === 'reject') {
      expect(verdict.reason).toContain('çözünürlüğü düşürün');
    }
  });

  it('tam sınırdaki dosya reddedilmez', () => {
    expect(checkUploadSize(MAX_UPLOAD_BYTES).kind).toBe('optimize');
  });

  it('boş dosyayı reddeder', () => {
    expect(checkUploadSize(0).kind).toBe('reject');
  });
});

describe('formatBytes', () => {
  it('ölçeğe göre birim seçer', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
    expect(formatBytes(48 * 1024 * 1024)).toBe('48 MB');
  });
});
