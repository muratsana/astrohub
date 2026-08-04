import { describe, expect, it } from 'vitest';
import { formatPhotoWeekLabel, photoWeekArchive, selectWeeklyPhoto } from './weeklyPick';
import { photos } from './data';

describe('haftanın fotoğrafı etiketi', () => {
  it('ISO yıl-hafta kodunu kullanıcı rozetine çevirir', () => {
    expect(formatPhotoWeekLabel('2026-16')).toEqual({
      weekLabel: '16. Hafta',
      yearLabel: '2026',
    });
  });

  it('tamamlanmış tur yoksa fotoğraf kazanım arşivinden seçer', () => {
    const pick = selectWeeklyPhoto(photos, []);
    expect(pick?.weekLabel).toBe('32. Hafta');
  });

  it('arşivi haftaya göre yeni eskiden sıralar', () => {
    const archive = photoWeekArchive(photos, []);
    expect(archive.map((item) => item.weekLabel).slice(0, 3)).toEqual([
      '32. Hafta',
      '31. Hafta',
      '30. Hafta',
    ]);
  });
});
