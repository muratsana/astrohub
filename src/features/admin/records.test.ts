import { describe, expect, it } from 'vitest';
import { RECORD_KINDS, setRecordStatus, type RecordKind } from './records';

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
