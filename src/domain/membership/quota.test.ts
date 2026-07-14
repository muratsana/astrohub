import { describe, it, expect } from 'vitest';
import {
  canPublishPhoto,
  canCreateDraft,
  remainingPhotoQuota,
  formatQuotaLabel,
  MAX_ACTIVE_PHOTOS,
  MAX_DRAFT_PHOTOS,
} from './quota';

describe('üyelik kota kuralları', () => {
  it('50 sınırının altında yayımlamaya izin verir', () => {
    expect(canPublishPhoto({ activePublished: 49, drafts: 0 })).toBe(true);
  });

  it('50. fotoğrafta yayımlamayı engeller', () => {
    expect(
      canPublishPhoto({ activePublished: MAX_ACTIVE_PHOTOS, drafts: 0 })
    ).toBe(false);
  });

  it('taslak sınırını uygular', () => {
    expect(canCreateDraft({ activePublished: 0, drafts: MAX_DRAFT_PHOTOS })).toBe(
      false
    );
    expect(canCreateDraft({ activePublished: 0, drafts: 3 })).toBe(true);
  });

  it('kalan kotayı hesaplar ve negatife düşmez', () => {
    expect(remainingPhotoQuota({ activePublished: 34, drafts: 0 })).toBe(16);
    expect(remainingPhotoQuota({ activePublished: 60, drafts: 0 })).toBe(0);
  });

  it('panel etiketini biçimlendirir', () => {
    expect(formatQuotaLabel(34)).toBe('34 / 50');
  });
});
