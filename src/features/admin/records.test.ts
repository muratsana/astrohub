import { describe, expect, it } from 'vitest';
import {
  RECORD_KINDS,
  mergeEventSeeds,
  restoreRecord,
  setRecordStatus,
  softDeletePhotoDrafts,
  softDeleteRecord,
  type RecordKind,
} from './records';

/**
 * İÇERİK KAYITLARI — tür tanımlarının bütünlüğü.
 *
 * Bu dosyadaki asıl risk YAZIM HATASI: `RECORD_KINDS` tablo ve kolon
 * adlarını string olarak taşıyor, TypeScript onları doğrulamıyor ve
 * yanlış bir kolon adı panelin o sekmesini sessizce boşaltıyor —
 * kullanıcı "kayıt yok" görüyor, hata görmüyor.
 *
 * Sorguların canlı şemaya uyduğu ayrıca ölçüldü (rol taklidiyle, geri
 * alınan bir işlemde); buradaki testler tanımın kendi içinde tutarlı
 * kalmasını koruyor.
 */

const KINDS = Object.keys(RECORD_KINDS) as RecordKind[];

describe('RECORD_KINDS · tanım bütünlüğü', () => {
  it('beş içerik türünü de taşıyor', () => {
    expect(KINDS).toEqual(['photo', 'listing', 'thread', 'event', 'site']);
  });

  /*
   * `select` ifadesindeki her kolon `map` tarafından okunabilmeli ve
   * `map`in okuduğu her kolon `select`te olmalı. İkisi ayrışırsa satır
   * ya eksik çizilir ya da PostgREST hata verir.
   */
  it('her tür id ve created_at seçiyor — sıralama buna dayanıyor', () => {
    for (const k of KINDS) {
      const spec = RECORD_KINDS[k];
      expect(spec.select, k).toContain('id');
      expect(spec.select, k).toContain(spec.orderColumn);
    }
  });

  it('etkinlik admin listesi başlangıç tarihine göre sıralanıyor', () => {
    expect(RECORD_KINDS.event.select).toContain('starts_at');
    expect(RECORD_KINDS.event.orderColumn).toBe('starts_at');
  });

  it('durum sütunu olan türlerde değer listesi boş değil', () => {
    for (const k of KINDS) {
      const spec = RECORD_KINDS[k];
      if (spec.statusColumn) {
        expect(spec.statuses.length, k).toBeGreaterThan(0);
      }
    }
  });

  /*
   * Forumda `status` kolonu YOK; kilit ayrı bir boolean. Bu ayrımın
   * kaybolması, olmayan bir kolona yazma denemesi demek.
   */
  it('forum konusunun durum sütunu yok', () => {
    expect(RECORD_KINDS.thread.statusColumn).toBeNull();
    expect(RECORD_KINDS.thread.statuses).toHaveLength(0);
  });

  it('gözlem noktası region okuyor — şemada city yok', () => {
    expect(RECORD_KINDS.site.select).toContain('region');
    expect(RECORD_KINDS.site.select).not.toContain('city');
  });

  it('her türün bir etiketi var', () => {
    for (const k of KINDS) {
      expect(RECORD_KINDS[k].label.length, k).toBeGreaterThan(0);
    }
  });
});

describe('mergeEventSeeds · public katalogla admin listesi aynı', () => {
  it('DBde olmayan Ethem Hoca etkinliğini yönetim listesine ekler', () => {
    const rows = mergeEventSeeds([], 40);
    const ethem = rows.find((row) =>
      row.title.includes('Ethem Hoca ile Gökyüzü Gözlem Şenliği')
    );

    expect(ethem).toMatchObject({
      subtitle: 'Denizli',
      status: 'yayinda',
      path: '/etkinlik/ethem-hoca-gokyuzu-gozlem-senligi-2026',
      readOnly: true,
    });
  });

  it('aynı slug DBden geldiyse tohumu ikinci kez eklemez', () => {
    const rows = mergeEventSeeds(
      [
        {
          id: 'db-1',
          title: 'DB Ethem',
          subtitle: 'Denizli',
          status: 'yayinda',
          createdAt: '2026-08-11T16:00:00+03:00',
          path: '/etkinlik/ethem-hoca-gokyuzu-gozlem-senligi-2026',
          deletedAt: null,
        },
      ],
      40
    );

    expect(
      rows.filter((row) =>
        row.path?.endsWith('ethem-hoca-gokyuzu-gozlem-senligi-2026')
      )
    ).toHaveLength(1);
  });
});

describe('RECORD_KINDS · satır eşleme', () => {
  it('başlıksız kaydı boş bırakmıyor', () => {
    const row = RECORD_KINDS.photo.map({ id: 'x', title: null, status: 'draft' });
    expect(row.title).toBe('(başlıksız)');
  });

  it('adsız gözlem noktasını boş bırakmıyor', () => {
    const row = RECORD_KINDS.site.map({ id: 'x', name: '  ', status: 'pending' });
    expect(row.title).toBe('(adsız)');
  });

  /*
   * Slug yoksa bağlantı kurulmamalı: `/fotograf/undefined` adresine
   * götüren bir satır, yöneticiye 404 gösterir.
   */
  it('slug yoksa bağlantı üretmiyor', () => {
    expect(RECORD_KINDS.photo.map({ id: 'x', status: 'draft' }).path).toBeNull();
    expect(RECORD_KINDS.listing.map({ id: 'x', status: 'draft' }).path).toBeNull();
  });

  it('slug varsa doğru rotayı kuruyor', () => {
    expect(RECORD_KINDS.photo.map({ id: 'x', slug: 'a', status: 'd' }).path).toBe(
      '/fotograf/a'
    );
    expect(RECORD_KINDS.site.map({ id: 'x', slug: 'b', status: 'd' }).path).toBe(
      '/saha/b'
    );
  });

  it('forum kilidini duruma çeviriyor', () => {
    expect(RECORD_KINDS.thread.map({ id: 'x', locked: true }).status).toBe(
      'kilitli'
    );
    expect(RECORD_KINDS.thread.map({ id: 'x', locked: false }).status).toBe(
      'açık'
    );
  });

  it('fotoğrafın sahibini @ ile gösteriyor', () => {
    const row = RECORD_KINDS.photo.map({
      id: 'x',
      status: 'published',
      profiles: { username: 'muratsana' },
    });
    expect(row.subtitle).toBe('@muratsana');
  });

  it('sahibi okunamayan fotoğrafta alt satırı boş bırakıyor', () => {
    expect(
      RECORD_KINDS.photo.map({ id: 'x', status: 'published', profiles: null })
        .subtitle
    ).toBeNull();
  });
});

describe('setRecordStatus · beyaz liste', () => {
  /*
   * ASIL KURAL. Beyaz liste olmasaydı serbest bir string doğrudan enum
   * kısıtına gider ve kullanıcıya ham veritabanı hatası dönerdi. Daha
   * kötüsü: geçerli ama YANLIŞ bir enum değeri (ör. fotoğrafa 'sold')
   * sessizce yazılabilirdi.
   */
  it('tanımsız durumu reddediyor', async () => {
    await expect(setRecordStatus('photo', 'x', 'sold')).rejects.toThrow(
      /Geçersiz durum/
    );
  });

  it('durum sütunu olmayan türde yazmayı reddediyor', async () => {
    await expect(setRecordStatus('thread', 'x', 'açık')).rejects.toThrow(
      /durum değiştirilemiyor/
    );
  });
});

/**
 * SOFT DELETE TANIMI (FAZ 3).
 *
 * `softDeletable` bayrağı bir arayüz kararını değil ŞEMA GERÇEĞİNİ
 * anlatıyor: `deleted_at` kolonu altı içerik tablosuna eklendi, forum
 * konularına eklenmedi. Bayrak yanlış olursa panel var olmayan bir
 * kolonu sorgular ve o sekme ham veritabanı hatasıyla boşalır.
 */
describe('softDeletable · şemayla hizalı', () => {
  it('deleted_at taşıyan türler seçim listesinde de onu istiyor', () => {
    for (const k of KINDS) {
      const spec = RECORD_KINDS[k];
      if (spec.softDeletable) {
        expect(spec.select, k).toContain('deleted_at');
      } else {
        expect(spec.select, k).not.toContain('deleted_at');
      }
    }
  });

  it('forum konusu soft delete edilemiyor — o tabloda kolon yok', () => {
    expect(RECORD_KINDS.thread.softDeletable).toBe(false);
  });

  it('beş içerik türünün dördü soft delete edilebiliyor', () => {
    const acik = KINDS.filter((k) => RECORD_KINDS[k].softDeletable);
    expect(acik).toEqual(['photo', 'listing', 'event', 'site']);
  });
});

describe('softDeleteRecord / restoreRecord · desteklenmeyen tür', () => {
  /*
   * Veritabanına HİÇ GİTMEDEN reddediliyor. Forum konusunda `deleted_at`
   * yok; istek gitseydi PostgREST "column does not exist" derdi ve
   * yönetici bunu bir yetki sorunu sanabilirdi.
   */
  it('forum konusunda kaldırma açıkça reddediliyor', async () => {
    await expect(softDeleteRecord('thread', 'x')).rejects.toThrow(
      /bu ekrandan yapılamıyor/
    );
  });

  it('forum konusunda geri alma açıkça reddediliyor', async () => {
    await expect(restoreRecord('thread', 'x')).rejects.toThrow(/geri alma yok/);
  });
});

describe('softDeletePhotoDrafts · güvenli toplu işlem', () => {
  it('boş seçimde veritabanına gitmeden sıfır döner', async () => {
    await expect(softDeletePhotoDrafts([])).resolves.toBe(0);
  });
});
