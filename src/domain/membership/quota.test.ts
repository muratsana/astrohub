import { describe, it, expect } from 'vitest';
import {
  canPublishPhoto,
  canCreateDraft,
  remainingPhotoQuota,
  formatQuotaLabel,
  quotaFullMessage,
  checkUploadSize,
  formatBytes,
  tierStorageBudgetBytes,
  PHOTO_LIMITS,
  MAX_DRAFT_PHOTOS,
  MAX_UPLOAD_BYTES,
  MAX_STORED_BYTES,
  DIRECT_UPLOAD_BYTES,
} from './quota';

describe('kademeye göre fotoğraf kotası', () => {
  it('standart üyelik beşte durur', () => {
    expect(
      canPublishPhoto({ activePublished: 4, drafts: 0, tier: 'standart' })
    ).toBe(true);
    expect(
      canPublishPhoto({
        activePublished: PHOTO_LIMITS.standart,
        drafts: 0,
        tier: 'standart',
      })
    ).toBe(false);
  });

  it('premium üyelik otuzda durur', () => {
    expect(
      canPublishPhoto({ activePublished: 29, drafts: 0, tier: 'premium' })
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
    expect(
      canPublishPhoto({ activePublished: PHOTO_LIMITS.standart, drafts: 0 })
    ).toBe(false);
    expect(remainingPhotoQuota({ activePublished: 1, drafts: 0 })).toBe(
      PHOTO_LIMITS.standart - 1
    );
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
    expect(formatQuotaLabel(2, 'standart')).toBe('2 / 5');
    expect(formatQuotaLabel(24, 'premium')).toBe('24 / 30');
  });

  /*
   * Kota bir cömertlik ayarı değil, depolama bütçesi. Sayı değişirse
   * bütçe de değişir; bu test ikisinin bağını görünür tutuyor ve
   * "premium'u 100 yapalım" kararının maliyetini testte gösteriyor.
   */
  it('kademe bütçesi fotoğraf sayısıyla dosya tavanının çarpımıdır', () => {
    const standart = tierStorageBudgetBytes('standart');
    const premium = tierStorageBudgetBytes('premium');

    expect(standart).toBeGreaterThan(PHOTO_LIMITS.standart * MAX_STORED_BYTES);
    expect(premium / standart).toBeCloseTo(
      PHOTO_LIMITS.premium / PHOTO_LIMITS.standart,
      5
    );
    // Premium üye 100 GB'lık Pro deposunun binde dördünden fazlasını yemesin.
    expect(premium).toBeLessThan(0.004 * 100 * 1024 ** 3);
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
  it('saklama tavanının altındaki dosyayı olduğu gibi kabul eder', () => {
    expect(checkUploadSize(2 * 1024 * 1024).kind).toBe('ok');
    expect(checkUploadSize(MAX_STORED_BYTES).kind).toBe('ok');
  });

  /*
   * En kritik davranış: 10 MB üstü RET DEĞİL. Kullanıcıya yapabileceğimiz
   * bir işi elle yaptırmak yerine dosyayı biz küçültüyoruz.
   */
  it('10 MB üstünü küçülterek kabul eder — reddetmez', () => {
    const verdict = checkUploadSize(DIRECT_UPLOAD_BYTES + 1);
    expect(verdict.kind).toBe('optimize');
    if (verdict.kind === 'optimize') {
      expect(verdict.reason).toContain('küçültülecek');
      // Ne kaybedileceği açıkça yazmalı: ölçü değil, sıkıştırma.
      expect(verdict.reason).toContain('Çözünürlük korunur');
    }
  });

  it('saklama tavanı ile işleme tavanı ayrı sayılardır', () => {
    expect(MAX_STORED_BYTES).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(DIRECT_UPLOAD_BYTES).toBe(MAX_STORED_BYTES);
  });

  it('işleyemeyeceğimiz boyutu reddeder ve ne yapılacağını söyler', () => {
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
    expect(formatBytes(MAX_STORED_BYTES)).toBe('10 MB');
  });
});
