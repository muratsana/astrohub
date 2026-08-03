import { byText, type ExplorerSpec } from '@/features/explorer/query';
import { eventTypeLabels, type AstroEvent } from './types';

/**
 * ETKİNLİKLERİN DATA EXPLORER TANIMI (Faz 4).
 *
 * GEÇMİŞ/GELECEK FACET OLARAK — belge §7.1 bunu adıyla istiyor
 * ("gelecek/geçmiş etkinlikler") ve sayfada hiç yoktu. Kıyas ANI değil
 * GÜNÜ alıyor: bugün öğleden sonra başlayan bir etkinlik sabah
 * bakıldığında "gelecek", akşam bakıldığında "geçmiş" görünmemeli —
 * kullanıcı için o hâlâ bugünün etkinliği.
 *
 * `valueOf` her çağrıda `new Date()` okuyor. Modül yüklenirken bir kez
 * hesaplansaydı, gece yarısını devreden açık bir sekmede "bugün" dünde
 * kalırdı.
 */
function bugunBasi(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export const eventsSpec: ExplorerSpec<AstroEvent> = {
  searchFields: (e) => [e.title, e.city, e.venue, e.organizer.name],

  facets: [
    {
      param: 'tur',
      label: 'Tür',
      valueOf: (e) => e.type,
      labelOf: (v) => eventTypeLabels[v as keyof typeof eventTypeLabels] ?? v,
    },
    { param: 'sehir', label: 'Şehir', valueOf: (e) => e.city },
    {
      param: 'zaman',
      label: 'Zaman',
      valueOf: (e) =>
        new Date(e.startsAt).getTime() >= bugunBasi() ? 'gelecek' : 'gecmis',
      labelOf: (v) => (v === 'gelecek' ? 'Yaklaşan' : 'Geçmiş'),
    },
    {
      param: 'ucretsiz',
      label: 'Ücretsiz',
      valueOf: (e) => (e.free ? 'evet' : null),
      labelOf: () => 'evet',
    },
    {
      param: 'ucretli',
      label: 'Ücretli',
      valueOf: (e) => (!e.free ? 'evet' : null),
      labelOf: () => 'evet',
    },
    {
      param: 'kamp',
      label: 'Kamp',
      valueOf: (e) => (e.camping ? 'evet' : null),
      labelOf: () => 'var',
    },
  ],

  /*
   * TARİH ARALIĞI (§7.1) — `zaman` facet'inin YERİNE GEÇMİYOR, YANINDA.
   *
   * İkisi ayrı soruya cevap veriyor: "geçmiş mi gelecek mi" bir yön,
   * "14–21 Ağustos arası" bir pencere. Yön facet'ini kaldırıp yerine
   * aralık koymak, en sık sorulan soruyu ("yaklaşan neler var")
   * kullanıcıya iki tarih yazdırarak sordurmak olurdu.
   *
   * `valueOf` epoch ms veriyor; `kind: 'date'` yalnızca URL yazımını
   * (`?tarih_min=2026-08-14`) ve girdi tipini belirliyor.
   */
  ranges: [
    {
      param: 'tarih',
      label: 'Tarih',
      kind: 'date',
      valueOf: (e) => {
        const t = new Date(e.startsAt).getTime();
        return Number.isFinite(t) ? t : null;
      },
      format: (n) =>
        new Date(n).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
        }),
    },
  ],

  sorts: [
    {
      value: 'yaklasan',
      label: 'Yaklaşan',
      compare: (a, b) => a.startsAt.localeCompare(b.startsAt),
    },
    {
      value: 'yeni',
      label: 'En yeni',
      compare: (a, b) => b.startsAt.localeCompare(a.startsAt),
    },
    { value: 'baslik', label: 'Başlık (A–Z)', compare: byText((e) => e.title) },
    { value: 'sehir', label: 'Şehir (A–Z)', compare: byText((e) => e.city) },
  ],

  defaultSort: 'yaklasan',
};
