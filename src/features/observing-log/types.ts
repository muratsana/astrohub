/**
 * GÖZLEM GÜNLÜĞÜ — tipler ve saf kurallar (§14.6).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN FOTOĞRAF ARŞİVİNDEN AYRI
 *
 * §14'ün açılış kuralı "çakışan modülleri birleştir" diyor; önce
 * birleşir mi diye bakıldı, birleşmiyor:
 *
 *   `astro_photos`     → bir GÖRÜNTÜNÜN künyesi. Çıktısı bir dosya.
 *   `observation_logs` → bir GECENİN kaydı. Çıktısı OLMAYABİLİR —
 *                        dürbünle bakıp not almak da gözlemdir ve §14.6
 *                        "çizim/fotoğraf" diyerek bunu zorunlu saymıyor.
 *
 * Tek tabloda toplamak, fotoğrafsız kayıtlar için yarısı boş bir satır
 * ve "bu foto mu gözlem mi" diye soran bir tür sütunu demekti. Ayrılar
 * ama bağlılar: `photoId` ile geceye o gecenin fotoğrafı iliştiriliyor.
 */

export interface ObservationLog {
  id: string;
  userId: string;
  /** Gözlemin yapıldığı gece — `YYYY-MM-DD`. */
  observedOn: string;
  locationText: string | null;
  siteSlug: string | null;
  target: string | null;
  /** 1–5, büyük = iyi. `null` = girilmemiş. */
  seeing: number | null;
  transparency: number | null;
  equipment: string | null;
  note: string | null;
  photoId: string | null;
  isPublic: boolean;
  createdAt: string;
}

/** Yeni kayıt / düzenleme girdisi. `userId` sunucudan geliyor. */
export interface ObservationDraft {
  observedOn: string;
  locationText?: string;
  siteSlug?: string | null;
  target?: string;
  seeing?: number | null;
  transparency?: number | null;
  equipment?: string;
  note?: string;
  photoId?: string | null;
  isPublic?: boolean;
}

/**
 * KOŞUL ÖLÇEĞİ 1–5 VE BÜYÜK = İYİ.
 *
 * Klasik Antoniadi ölçeği TERSİNE çalışır (I en iyi, V en kötü) ve
 * astronomi literatüründe yaygındır. Burada tersi seçildi çünkü arayüzde
 * yıldız gibi okunuyor: "4/5" gören herkes bunu iyi sanır. Doğru olanı
 * kullanıp her ekranda "1 en iyidir" diye açıklamak, açıklamayı
 * okumayan herkesi yanıltırdı — ve ölçek zaten kullanıcının kendi
 * defteri için, yayımlanacak bir ölçüm değil.
 */
export const CONDITION_LABELS: Record<number, string> = {
  1: 'Çok kötü',
  2: 'Kötü',
  3: 'Orta',
  4: 'İyi',
  5: 'Mükemmel',
};

export const MAX_NOTE = 4000;
export const MAX_TARGET = 120;

/**
 * Kaydın kaydedilebilir olup olmadığını söyler.
 *
 * SUNUCU SON SÖZÜ SÖYLÜYOR — buradaki kontrol, kullanıcıya formu
 * doldurup "veritabanı reddetti" hatası aldırmamak için. Kısıtların
 * sahibi `0064`; buradaki liste onunla aynı sınırları kullanıyor ve
 * daha GENİŞ olmamalı (daha dar olması sorun değil).
 *
 * Boş dizeyi `null` saymak da burada: kullanıcı bir alanı doldurup
 * silerse `''` gönderilir ve veritabanında "boş metin" olarak durur —
 * "girilmemiş" ile "boş girilmiş" arasında ziyaretçi için hiçbir fark
 * yok, ama sorgu ve gösterimde iki ayrı durum olurdu.
 */
export function describeDraftProblem(
  draft: ObservationDraft,
  today = new Date()
): string | null {
  if (!draft.observedOn) return 'Gözlem tarihi gerekli.';

  const gun = new Date(`${draft.observedOn}T00:00:00Z`);
  if (Number.isNaN(gun.getTime())) return 'Gözlem tarihi okunamadı.';

  /* Bir gün pay: kullanıcı kendi diliminde "bu gece" derken sunucu UTC'de
     ertesi güne geçmiş olabilir. `0064`teki CHECK ile aynı pay. */
  const yarin = new Date(today);
  yarin.setUTCDate(yarin.getUTCDate() + 1);
  if (gun.getTime() > Date.UTC(yarin.getUTCFullYear(), yarin.getUTCMonth(), yarin.getUTCDate()))
    return 'Gelecek bir tarih için gözlem kaydı açılamaz.';

  if ((draft.target?.length ?? 0) > MAX_TARGET)
    return `Hedef adı en fazla ${MAX_TARGET} karakter olabilir.`;
  if ((draft.note?.length ?? 0) > MAX_NOTE)
    return `Not en fazla ${MAX_NOTE} karakter olabilir.`;

  for (const [ad, deger] of [
    ['Seeing', draft.seeing],
    ['Şeffaflık', draft.transparency],
  ] as const) {
    if (deger === null || deger === undefined) continue;
    if (!Number.isInteger(deger) || deger < 1 || deger > 5)
      return `${ad} 1 ile 5 arasında olmalı.`;
  }

  return null;
}

/**
 * Kaydın tek satırlık özeti — liste başlığı.
 *
 * Hedef girilmemiş olabilir (§14.6 hiçbir alanı zorunlu kılmıyor, tarih
 * hariç). O durumda "Gözlem" demek, boş bir başlık göstermekten iyi:
 * tıklanacak bir şey olduğu görünüyor.
 */
export function logTitle(log: Pick<ObservationLog, 'target'>): string {
  return log.target?.trim() || 'Gözlem';
}
