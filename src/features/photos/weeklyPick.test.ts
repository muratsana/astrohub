import { describe, expect, it } from 'vitest';
import {
  formatPhotoWeekLabel,
  isoWeekFromDateString,
  isoWeekLabelFromDate,
  photoWeekLabelFromDateString,
  photoWeekArchive,
  selectWeeklyPhoto,
} from './weeklyPick';
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

  it('canlı veri hafta kaydı vermediğinde güncel haftayı rozetler', () => {
    const pick = selectWeeklyPhoto(
      [{ ...photos[0], editorsPick: true, photoOfWeekWins: [] }],
      [],
      new Date('2026-08-05T12:00:00Z')
    );

    expect(pick?.label).toBe('2026-32');
    expect(pick?.weekLabel).toBe('32. Hafta');
    expect(pick?.yearLabel).toBe('2026');
  });

  it('ISO hafta etiketini yıl sınırında doğru üretir', () => {
    expect(isoWeekLabelFromDate(new Date('2026-01-01T12:00:00Z'))).toBe(
      '2026-01'
    );
  });

  it('tarih değerinden ISO yıl ve hafta numarasını birlikte üretir', () => {
    expect(isoWeekFromDateString('2026-08-21T12:00:00')).toEqual({
      isoYear: 2026,
      isoWeek: 34,
      label: '2026-34',
    });
  });

  it('yayın tarihinden hafta rozeti üretir', () => {
    expect(photoWeekLabelFromDateString('2026-08-20T09:00:00Z')).toEqual({
      label: '2026-34',
      weekLabel: '34. Hafta',
      yearLabel: '2026',
    });
    expect(photoWeekLabelFromDateString('bozuk')).toBeNull();
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
