import { describe, expect, it } from 'vitest';
import { filterCatalog, paginate } from './equipment';
import type { EquipmentModel } from '@/features/equipment/data';

function model(
  slug: string,
  brand: string,
  name: string,
  category: EquipmentModel['category']
): EquipmentModel {
  return { slug, brand, model: name, category, specs: {} };
}

const catalog: EquipmentModel[] = [
  model('a', 'Sky-Watcher', 'Esprit 100ED', 'optik-tup'),
  model('b', 'Sky-Watcher', 'EQ6-R Pro', 'montur'),
  model('c', 'ZWO', 'ASI2600MM Pro', 'astro-kamera'),
  model('d', 'ZWO', 'ASI533MC Pro', 'astro-kamera'),
  model('e', 'Askar', 'FRA400', 'optik-tup'),
  model('f', 'Optolong', 'L-eXtreme', 'filtre'),
  model('g', 'İstanbul Optik', 'İZ-80', 'optik-tup'),
];

describe('filterCatalog', () => {
  it('süzgeç yoksa hepsini verir', () => {
    expect(filterCatalog(catalog, {})).toHaveLength(catalog.length);
  });

  it('kategoriye göre eler', () => {
    expect(filterCatalog(catalog, { category: 'astro-kamera' })).toHaveLength(2);
  });

  it('"hepsi" bir kategori değil, elemez', () => {
    expect(filterCatalog(catalog, { category: 'hepsi' })).toHaveLength(
      catalog.length
    );
  });

  it('markaya göre eler', () => {
    expect(filterCatalog(catalog, { brand: 'ZWO' }).map((m) => m.slug)).toEqual([
      'c',
      'd',
    ]);
  });

  it('marka ve model üzerinde birlikte arar', () => {
    expect(filterCatalog(catalog, { search: 'esprit' }).map((m) => m.slug)).toEqual(
      ['a']
    );
    expect(filterCatalog(catalog, { search: 'zwo' })).toHaveLength(2);
  });

  it('Türkçe İ harfi her iki yönde de eşleşir', () => {
    // JavaScript'in VARSAYILAN küçültmesi "İ" harfini iki kod noktasına
    // ("i" + birleşen nokta) çeviriyor ve "istanbul" araması "İstanbul"
    // kaydını bulamıyor. Projede bu daha önce bir kez sessizce boş sonuç
    // üretmişti; `toLocaleLowerCase('tr-TR')` doğru eşlemeyi yapıyor.
    expect(filterCatalog(catalog, { search: 'İZ-80' }).map((m) => m.slug)).toEqual(
      ['g']
    );
    expect(filterCatalog(catalog, { search: 'istanbul' }).map((m) => m.slug)).toEqual(
      ['g']
    );
    expect(filterCatalog(catalog, { search: 'İstanbul' })).toHaveLength(1);
  });

  it('süzgeçleri birlikte uygular', () => {
    expect(
      filterCatalog(catalog, { category: 'optik-tup', search: 'fra' })
    ).toHaveLength(1);
  });
});

describe('paginate', () => {
  it('sayfa boyutuna böler ve toplamı korur', () => {
    const first = paginate(catalog, { page: 0, pageSize: 3 });
    expect(first.items).toHaveLength(3);
    // Toplam SAYFADAKİ değil, süzgece uyan kayıt sayısı: "kaç sonuç var"
    // sorusu sayfalamadan bağımsız cevaplanmalı.
    expect(first.total).toBe(7);
  });

  it('son sayfa eksik dolabilir', () => {
    const last = paginate(catalog, { page: 2, pageSize: 3 });
    expect(last.items).toHaveLength(1);
    expect(last.total).toBe(7);
  });

  it('aralık dışı sayfa boş döner, çökmez', () => {
    expect(paginate(catalog, { page: 9, pageSize: 3 }).items).toEqual([]);
  });

  it('negatif sayfa ilk sayfaya kırpılır', () => {
    expect(paginate(catalog, { page: -4, pageSize: 3 }).page).toBe(0);
  });

  it('süzgeçli toplam, süzgeçli sonuç sayısını verir', () => {
    const page = paginate(catalog, { category: 'optik-tup', pageSize: 2 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);
  });

  it('tohum kaynaktan gelen sayfa kalıcı olarak işaretlenmez', () => {
    // `durable` alanı arayüzde "veritabanından geldi" demek; tohum
    // diziyi kalıcı göstermek, yapılandırılmamış bir ortamı çalışıyor
    // gibi raporlardı.
    expect(paginate(catalog, {}).durable).toBe(false);
  });
});
