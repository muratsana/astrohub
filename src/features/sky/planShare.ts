import { buildCalendar, type IcsEvent } from '@/lib/ics';
import type { ScheduledSlot } from '@/domain/astronomy/sessionPlan';

/**
 * PLANI PAYLAŞ VE TAKVİME EKLE (§14.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * PAYLAŞILABİLİR PLAN — TABLO AÇILMADI, ADRESE KODLANDI
 *
 * §14.1 "paylaşılabilir plan" istiyor. Bunun için bir `plans` tablosu
 * açmak mümkündü ve YAPILMADI, çünkü paylaşılan şey birkaç yüz baytlık
 * bir seçim: hedef slug'ları ve dakikaları. Tablo açmak demek; RLS,
 * kısa adres üretimi, sahiplik, silme akışı ve "paylaştığım plan ne
 * zaman silinir" sorusu demekti.
 *
 * Adres çubuğu bu veriyi zaten taşıyabiliyor:
 *
 *     /planlayici?h=m31-andromeda:90,m42-orion:120&y=30
 *
 * Sonuç: bağlantı kopyalanabiliyor, forumda paylaşılabiliyor, yer imine
 * eklenebiliyor ve SUNUCUDA HİÇBİR ŞEY SAKLANMIYOR — silinecek bir şey
 * de yok. Plan zaten tarayıcıda hesaplanıyor (`PlannerPage` başlığı),
 * yani bağlantıyı açan kişi aynı hesabı kendi konumuyla yapıyor.
 *
 * SINIR: çok uzun listeler adres sınırlarını zorlar. Onlarca hedefli bir
 * gece planı gerçekçi değil (bir gecede 5–8 hedef çok), o yüzden bugün
 * bir sorun değil; olursa çözüm tabloya geçmek olur ve bu satır o kararı
 * verecek kişiye gerekçeyi bırakıyor.
 *
 * KONUM PAYLAŞILMIYOR. Bağlantıda yalnızca hedefler ve süreler var;
 * açan kişinin kendi konumu kullanılıyor. Konumu da koysaydık, planını
 * paylaşan kullanıcı nerede gözlem yaptığını da paylaşmış olurdu —
 * §14.4'ün korumaya çalıştığı şey.
 */

export interface PlanSelection {
  slug: string;
  minutes: number;
}

/** Hedef listesini adres parçasına çevirir: `m31:90,m42:120`. */
export function encodeSelection(selection: PlanSelection[]): string {
  return selection
    .filter((s) => s.slug && s.minutes > 0)
    .map((s) => `${s.slug}:${Math.round(s.minutes)}`)
    .join(',');
}

/**
 * Adres parçasını hedef listesine çevirir.
 *
 * BOZUK GİRDİ SESSİZCE ELENİYOR, HATA ATILMIYOR. Bu veri adres
 * çubuğundan geliyor; kullanıcı elle kurcalayabilir ya da bağlantı
 * kırpılmış olabilir. Tek bozuk parça yüzünden planın tamamını
 * reddetmek, çalışabilecek bir şeyi çöpe atmak olurdu.
 *
 * `known` verilirse katalogda olmayan slug'lar da eleniyor — olmayan
 * bir hedefi listeye koymak, planlayıcıda boş bir satır demek.
 */
export function decodeSelection(
  raw: string | null,
  known?: ReadonlySet<string>
): PlanSelection[] {
  if (!raw) return [];

  const out: PlanSelection[] = [];
  const gorulen = new Set<string>();

  for (const parca of raw.split(',')) {
    const [slug, dakika] = parca.split(':');
    if (!slug) continue;

    const temiz = slug.trim();
    if (!/^[a-z0-9-]{2,120}$/.test(temiz)) continue;
    if (known && !known.has(temiz)) continue;
    /* Aynı hedef iki kez yazılmışsa ilki geçerli: planlayıcıda aynı
       satırdan iki tane, kullanıcının anlamlandıramayacağı bir durum. */
    if (gorulen.has(temiz)) continue;

    const n = Number(dakika);
    if (!Number.isFinite(n) || n <= 0) continue;

    gorulen.add(temiz);
    out.push({ slug: temiz, minutes: Math.min(Math.round(n), 24 * 60) });
  }

  return out;
}

/* ── Takvime ekleme ──────────────────────────────────────────────────── */

export interface PlanIcsInput {
  slots: ScheduledSlot[];
  /** Hedef slug → görünen ad. Slug takvimde okunmaz. */
  labelOf: (slug: string) => string;
  /** Gözlem yeri — takvim kaydının `LOCATION` alanı. */
  locationLabel?: string;
  /** Testte sabitlenebilsin diye. */
  now?: Date;
}

/**
 * Gece planını takvim dosyasına çevirir — hedef başına bir kayıt.
 *
 * TEK KAYIT DEĞİL ÇOK KAYIT. "Gözlem gecesi" diye tek bir blok
 * yazabilirdik; yazmadık, çünkü planın değeri hedeflerin SIRASINDA ve
 * saatlerinde. Tek blok, takvimde saat 22:10'da hangi hedefe
 * geçileceğini söylemezdi — yani planı takvime taşımış olmazdık, yalnızca
 * "bu gece meşgulüm" demiş olurduk.
 *
 * `UID` slug + başlangıç anına bağlı: aynı plan iki kez indirilirse
 * takvim kayıtları çoğalmıyor, ama başka bir gece için aynı hedef ayrı
 * kayıt oluyor.
 */
export function buildPlanIcs(input: PlanIcsInput): string {
  const events: IcsEvent[] = input.slots.map((slot) => {
    const ad = input.labelOf(slot.id);
    const tepe = Math.round(slot.peakAltitude);
    return {
      uid: `plan-${slot.id}-${slot.start.toISOString().slice(0, 10)}@astrohub`,
      start: slot.start,
      end: slot.end,
      summary: `${ad} — gözlem`,
      description: `Planlanan süre: ${slot.minutes} dk. En yüksek konum: ${tepe}°.`,
      ...(input.locationLabel ? { location: input.locationLabel } : {}),
    };
  });

  return buildCalendar(events, {
    product: 'GecePlani',
    ...(input.now ? { now: input.now } : {}),
  });
}

/** Dosya adı — tarihe bağlı, aynı klasöre birden çok gece inebilsin. */
export function planIcsFileName(slots: ScheduledSlot[]): string {
  const ilk = slots[0]?.start;
  const gun = ilk ? ilk.toISOString().slice(0, 10) : 'gece';
  return `astrohub-plan-${gun}.ics`;
}
