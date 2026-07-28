import { describe, expect, it } from 'vitest';
import {
  detectDelimiter,
  matchColumn,
  parseNumber,
  parseSpecTable,
} from './specImport';

describe('matchColumn', () => {
  it('Türkçe ve İngilizce başlıkları aynı kolona bağlar', () => {
    expect(matchColumn('Odak')).toBe('focal_length_mm');
    expect(matchColumn('focal length')).toBe('focal_length_mm');
    expect(matchColumn('PİKSEL BOYUTU')).toBe('pixel_size_um');
  });

  it('parantez içindeki birimi yok sayar', () => {
    // Üretici tabloları başlığa birim yazar: "Odak (mm)".
    expect(matchColumn('Odak (mm)')).toBe('focal_length_mm');
    expect(matchColumn('Payload (kg)')).toBe('payload_capacity_kg');
  });

  it('alt çizgi ve tireyi boşluk sayar', () => {
    expect(matchColumn('image_circle')).toBe('image_circle_mm');
    expect(matchColumn('back-focus')).toBe('required_backfocus_mm');
  });

  it('tanımadığı başlığa null döner', () => {
    expect(matchColumn('Renk')).toBeNull();
  });
});

describe('detectDelimiter', () => {
  it('sekmeyi, noktalı virgülü ve virgülü tanır', () => {
    expect(detectDelimiter('marka\tmodel\todak')).toBe('\t');
    expect(detectDelimiter('marka;model;odak')).toBe(';');
    expect(detectDelimiter('marka,model,odak')).toBe(',');
  });

  it('tek sütunda sekmeye düşer', () => {
    expect(detectDelimiter('slug')).toBe('\t');
  });
});

describe('parseNumber', () => {
  it('birim ekini ve ondalık virgülü temizler', () => {
    // Üretici sayfasından doğrudan kopyalanan değerler böyle geliyor.
    expect(parseNumber('550 mm')).toBe(550);
    expect(parseNumber('3,76 µm')).toBe(3.76);
    expect(parseNumber('  12.5 kg ')).toBe(12.5);
  });

  it('ayrıştırılamayan değere null döner — sıfır yazmaz', () => {
    expect(parseNumber('bilinmiyor')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
});

describe('parseSpecTable', () => {
  const table = [
    'slug\tOdak (mm)\tAçıklık (mm)\tRenk',
    'askar-fra400\t400\t72\tbeyaz',
    'zwo-asi2600mm-pro\t\t\tsiyah',
  ].join('\n');

  it('tanınan sütunları eşler, tanınmayanı ayrı bildirir', () => {
    const result = parseSpecTable(table);
    expect(result.columns).toContain('focal_length_mm');
    expect(result.columns).toContain('aperture_mm');
    // Yok sayılan başlık sessizce kaybolmaz.
    expect(result.ignoredHeaders).toEqual(['Renk']);
  });

  it('yalnızca dolu hücreleri yazar', () => {
    const result = parseSpecTable(table);
    expect(result.rows[0].values).toEqual({
      focal_length_mm: 400,
      aperture_mm: 72,
    });
  });

  it('boş satırı "yazacak alan yok" diye işaretler, silme olarak değil', () => {
    // Boş hücre "bu değeri sil" demek değil; dar bir tablo yüklemek
    // elde olan veriyi silmemeli.
    const result = parseSpecTable(table);
    expect(result.rows[1].values).toEqual({});
    expect(result.rows[1].problems.join(' ')).toContain('Yazılacak alan yok');
  });

  it('sayıya çevrilemeyen hücreyi hata olarak bildirir', () => {
    const result = parseSpecTable('slug\tOdak\nx-y\tbilinmiyor');
    expect(result.rows[0].problems.join(' ')).toContain('sayıya çevrilemedi');
    expect(result.rows[0].values.focal_length_mm).toBeUndefined();
  });

  it('sıfır ve negatif ölçüyü reddeder', () => {
    const result = parseSpecTable('slug\tOdak\nx-y\t0');
    expect(result.rows[0].problems.join(' ')).toContain('negatif olamaz');
  });

  it('bilinmeyen bağlantı standardını reddeder', () => {
    const result = parseSpecTable('slug\tÇıkış\nx-y\tM99x1');
    expect(result.rows[0].problems.join(' ')).toContain('bilinen bir bağlantı');
  });

  it('eşleşme anahtarı olmayan satırı işaretler', () => {
    const result = parseSpecTable('Odak\n400');
    expect(result.rows[0].problems.join(' ')).toContain('slug ya da marka+model');
  });

  it('marka+model ikilisini eşleşme anahtarı sayar', () => {
    const result = parseSpecTable('Marka\tModel\tOdak\nAskar\tFRA400\t400');
    expect(result.rows[0].problems).toEqual([]);
    expect(result.rows[0].brand).toBe('Askar');
    expect(result.rows[0].model).toBe('FRA400');
  });

  it('temiz satır sayısını verir', () => {
    const result = parseSpecTable(table);
    expect(result.clean).toBe(1);
  });

  it('başlıksız ya da tek satırlık girdide çökmez', () => {
    expect(parseSpecTable('').rows).toEqual([]);
    expect(parseSpecTable('yalnızca başlık').rows).toEqual([]);
  });

  it('virgülle ayrılmış tabloyu da okur', () => {
    const result = parseSpecTable('slug,Odak\naskar-fra400,400');
    expect(result.rows[0].values.focal_length_mm).toBe(400);
  });

  it('satır numarası dosyadaki gerçek satırı gösterir', () => {
    // Kullanıcı hangi satırın sorunlu olduğunu dosyada bulabilmeli.
    const result = parseSpecTable(table);
    expect(result.rows[0].line).toBe(2);
    expect(result.rows[1].line).toBe(3);
  });
});
