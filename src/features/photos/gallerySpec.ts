import { byNumber, byText, type ExplorerSpec } from '@/features/explorer/query';
import { familyOf, photoFamilies } from './families';
import type { AstroPhoto } from './types';

/**
 * GALERİNİN DATA EXPLORER TANIMI (Faz 4).
 *
 * Galeri kendi süzme, sıralama ve arama mantığını `filtering.ts` içinde
 * taşıyordu. Bu dosya onun yerine ORTAK motora ne süzeceğini söylüyor;
 * mantığın kendisi `explorer/query.ts` içinde ve orada test ediliyor.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ARAMA ARTIK ASCII KATLIYOR
 *
 * Eski galeri araması yalnızca `toLocaleLowerCase('tr-TR')` yapıyordu,
 * yani "cankiri" yazan kullanıcı "Çankırı"yı BULAMIYORDU. Ortak motor
 * `normalizeTr` kullanıyor ve o kural veritabanındaki
 * `app.tr_normalize` ile aynı.
 */

const SIRALAMA_ETIKET: Record<string, string> = {
  yeni: 'En yeni',
  populer: 'En çok beğenilen',
  yorum: 'En çok yorumlanan',
  editor: 'Editör seçimi',
  ad: 'Başlık (A–Z)',
};

export const gallerySpec: ExplorerSpec<AstroPhoto> = {
  searchFields: (p) => [
    p.title,
    p.target.name,
    p.target.catalog,
    p.user.username,
    p.user.displayName,
    p.city,
    /* Ekipman arama metnine dahil: "Newton" ya da "ASI294" yazan biri
       süzgeci bulmak zorunda kalmasın (§17.7). */
    p.setup.optic,
    p.setup.camera,
  ],

  facets: [
    {
      param: 'aile',
      label: 'Tür',
      valueOf: (p) => familyOf(p.type),
      labelOf: (v) => photoFamilies[v as keyof typeof photoFamilies]?.label ?? v,
    },
    { param: 'palet', label: 'Palet', valueOf: (p) => p.palette },
    { param: 'sehir', label: 'Şehir', valueOf: (p) => p.city },
    /*
     * EKİPMAN SÜZGEÇLERİ (§17.7).
     *
     * Optik ve kamera AYRI süzgeç, birleşik bir "ekipman" değil: kimse
     * "şu teleskop + şu kamera" ikilisini birlikte aramıyor; ya belirli
     * bir teleskobun ne yapabildiğini merak ediyor ya belirli bir
     * kameranın. Tek süzgeçte birleştirseydik her kombinasyon ayrı bir
     * seçenek olurdu ve liste kullanılamaz hale gelirdi.
     *
     * Montür bilerek YOK: montür görüntünün kendisine değil takip
     * kalitesine etki ediyor ve "bu montürle çekilenler" sorusunun
     * karşılığı ekipman sayfasında, galeride değil.
     */
    { param: 'optik', label: 'Optik', valueOf: (p) => p.setup.optic },
    { param: 'kamera', label: 'Kamera', valueOf: (p) => p.setup.camera },
  ],

  sorts: [
    {
      value: 'yeni',
      label: SIRALAMA_ETIKET.yeni,
      /* ISO tarih metni; sıralamada yerel gerekmiyor — karşılaştırma
         karakter karakter ve biçim sabit. */
      compare: (a, b) => b.capturedAt.localeCompare(a.capturedAt),
    },
    { value: 'populer', label: SIRALAMA_ETIKET.populer, compare: byNumber((p) => p.likes) },
    { value: 'yorum', label: SIRALAMA_ETIKET.yorum, compare: byNumber((p) => p.comments) },
    {
      value: 'editor',
      label: SIRALAMA_ETIKET.editor,
      compare: (a, b) =>
        Number(b.editorsPick ?? false) - Number(a.editorsPick ?? false) ||
        b.likes - a.likes,
    },
    { value: 'ad', label: SIRALAMA_ETIKET.ad, compare: byText((p) => p.title) },
  ],

  defaultSort: 'yeni',
};
