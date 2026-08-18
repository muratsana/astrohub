import type { RecordKind } from '@/features/admin/records';

/**
 * PANELDEKİ DÜZENLEME EKRANININ ADRESİ — tek kaynak.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN YARDIMCI
 *
 * Adresler altı ayrı sayfada elle kuruluyordu ve üç farklı biçim ortaya
 * çıkmıştı: `/admin/listings?slug=`, `/admin/events?slug=`,
 * `/admin/icerik?kind=yazi&slug=`. Biçimlerden biri değiştiğinde
 * hangilerinin güncellendiğini görmenin yolu yoktu; güncellenmeyeni de
 * yalnızca tıklayan yönetici fark ederdi — panelde yanlış sekmeye
 * düşerek.
 *
 * Yol `getRecordKind` ile aynı eşlemeyi kullanıyor (bkz. `AdminPage`):
 * panel `/admin/events` adresini `event` türüne çeviriyor, burası da
 * `event` türünü o adrese. İki yön tek yerde tanımlı olmasa, biri
 * değiştiğinde öteki sessizce kırılırdı.
 */
const ROUTES: Record<RecordKind, string> = {
  photo: '/admin/icerik',
  listing: '/admin/listings',
  event: '/admin/events',
  site: '/admin/sites',
  /* Forum konularının kendi bölümü var ve orası zaten yalnızca konuları
     listeliyor — tür parametresine gerek yok. */
  thread: '/admin/forum',
};

export function adminEditPath(kind: RecordKind, slug: string): string {
  const base = ROUTES[kind];
  const params = new URLSearchParams({ slug });
  /*
   * Fotoğrafın kendi adresi yok: on iki sekmeli "İçerik" ekranına düşüyor
   * ve `record` parametresi hangi sekmenin açılacağını söylüyor.
   * Ötekilerde adres zaten türü belirtiyor (`getRecordKind`), parametreyi
   * tekrar yazmak gürültü olurdu.
   */
  if (kind === 'photo') params.set('record', kind);
  return `${base}?${params.toString()}`;
}


/**
 * İÇERİK GİRDİLERİ (`content_entries`) için düzenleme adresi.
 *
 * Haber, yazı, sözlük ve SSS kayıt tablosunda değil `content_entries`te
 * duruyor ve panelde ayrı bir sekme grubu kullanıyor (`kind=` parametresi
 * `record=` değil). Ayrı fonksiyon, çünkü tür kümeleri de ayrı: `photo`
 * bir `EntryKind` değil, `yazi` da bir `RecordKind` değil. Tek fonksiyona
 * sıkıştırmak, ikisini karıştıran bir çağrının derlenmesine izin
 * vermek olurdu.
 */
export type EntryEditKind = 'haber' | 'yazi' | 'sozluk' | 'sss';

export function entryEditPath(kind: EntryEditKind, slug: string): string {
  const params = new URLSearchParams({ kind, slug });
  return `/admin/icerik?${params.toString()}`;
}
