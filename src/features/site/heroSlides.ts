import { defaultHeroSlides, type HeroSlide } from '@/features/home/hero/slides';
import type { HeroScene } from '@/components/media/HeroBackdrop';

/**
 * HERO SLAYTLARI — ZİYARETÇİ TARAFI (§13.2, §6.3).
 *
 * §6.3 hero'dan on iki şey istiyor; on biri Faz 3'te yazıldı (güvenli
 * metin alanı, kenar güvenli oklar, mobil swipe, klavye, erişilebilir
 * isimler, `prefers-reduced-motion`, durdurma, hover/focus duraklaması…).
 * Kalan madde yönetilebilirlikti: "yayın tarihleri, sıralama, görsel odak
 * noktası, metin hizası ve CTA yönetimi".
 *
 * ══════════════════════════════════════════════════════════════════════
 * YAYIN PENCERESİ BURADA UYGULANMIYOR — RLS'TE
 *
 * `home_modules`ta pencereyi istemci de bilir (RPC uygular), burada
 * bilmiyor: `hero_slides`ın SELECT politikası ileri tarihli satırı hiç
 * döndürmüyor. Yani bu dosyada `publish_from` diye bir alan YOK ve
 * olmaması bilinçli — okunmayan bir alanı tipe koymak, birinin onu
 * istemcide "uygulamaya" çalışmasına davetiye çıkarır. Kural tek yerde:
 * veritabanında.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YEDEK: KODDAKİ BEŞ SLAYT
 *
 * Tablo boşsa, çağrı düşerse ya da Supabase yapılandırılmamışsa
 * `defaultHeroSlides` çiziliyor. Hero sayfanın İLK boyanan bloğu; boş
 * dönseydi ana sayfa bir ağ hatasında tepesi kesik açılırdı.
 *
 * "HEPSİ KAPALI" YEDEĞE DÜŞMEZ — ama hero da boş çizilmez: `HeroSection`
 * hiç slayt yoksa bölümü tamamen atlıyor. Yöneticinin hero'yu kaldırma
 * kararı uygulanıyor; ana sayfa modülü olarak `hero` zaten
 * `home_modules`tan da kapatılabilir.
 */

export interface HeroSlideView extends HeroSlide {
  /** Görsel odak noktası — `object-position` yüzdeleri. */
  focalX: number;
  focalY: number;
  textAlign: 'left' | 'center';
  /** Görselin üstüne basılan ek rozet; haftanın fotoğrafı gibi editoryal işaretler. */
  mediaBadge?: string;
}

/** Koddaki slaytlar, görünüm alanları varsayılanlarıyla. */
export const DEFAULT_HERO_SLIDES: HeroSlideView[] = defaultHeroSlides.map(
  (s) => ({ ...s, focalX: 50, focalY: 50, textAlign: 'left' })
);

/* Kodda karşılığı olan sahneler. Bilinmeyen bir sahne adı `HeroBackdrop`u
   boş bırakırdı; tabloya elle girilen bir değer hero'yu bozmasın. */
const SCENES: HeroScene[] = [
  'nebula',
  'gathering',
  'ridge',
  'instrument',
  'chart',
];

/**
 * Ham satırları çizilecek slaytlara çevirir.
 *
 * GÖRSEL VARSA KREDİ ZORUNLU. Veritabanı kısıtı bunu zaten tutuyor; buradaki
 * ikinci kapı, kredisi olmayan bir görselin ekrana ÇIKMAMASINI garanti
 * ediyor. CC BY lisansının şartı atıf; atıfsız gösterim lisans ihlali.
 * Eksikse görseli düşürüp slaytı çizilen sahnesiyle bırakıyoruz — slaytı
 * tamamen atmak, bir künye eksikliğini içerik kaybına çevirirdi.
 */
export function toHeroSlides(rows: unknown): HeroSlideView[] {
  if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_HERO_SLIDES;

  const acik = rows
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .filter((r) => r.enabled !== false);

  const gecerli = acik
    .map(normalize)
    .filter((s): s is Sirali => s !== null)
    .sort((a, b) => a.position - b.position)
    /* `position` görünüme sızmıyor: sıralama işi burada bitti, bileşenin
       dizi indeksinden başka bir sıra kavramına ihtiyacı yok. */
    .map((s) => soyut(s));

  /* Açık satır vardı ama hiçbiri çizilebilir değilse veri bozuk → yedek.
     Hepsi kapalıysa boş liste doğru cevap (yöneticinin kararı). */
  if (acik.length > 0 && gecerli.length === 0) return DEFAULT_HERO_SLIDES;
  return gecerli;
}

type Sirali = HeroSlideView & { position: number };

/** Sıralama alanını görünümden düşürür. */
function soyut({ position, ...slide }: Sirali): HeroSlideView {
  void position;
  return slide;
}

function normalize(row: Record<string, unknown>): Sirali | null {
  const key = metin(row.key);
  const title = metin(row.title);
  const ctaTo = metin(row.cta_to);
  /* Anahtarsız, başlıksız ya da hedefsiz slayt çizilemez: tıklanacak yeri
     olmayan bir CTA, çalışmayan bir düğme demek. */
  if (!key || !title || !guvenliAdres(ctaTo)) return null;

  const varsayilan = DEFAULT_HERO_SLIDES.find((s) => s.id === key);
  const url = metin(row.image_url);
  const credit = metin(row.image_credit);
  const licence = metin(row.image_licence);
  const gorselGecerli = Boolean(url) && url.startsWith('https://') && Boolean(credit) && Boolean(licence);

  return {
    id: key,
    badge: metin(row.badge) || varsayilan?.badge || '',
    title,
    subtitle: metin(row.subtitle),
    ctaLabel: metin(row.cta_label) || 'Aç',
    ctaTo,
    scene: SCENES.includes(row.scene as HeroScene)
      ? (row.scene as HeroScene)
      : (varsayilan?.scene ?? 'nebula'),
    tint: /^\d{1,3},\d{1,3},\d{1,3}$/.test(metin(row.tint))
      ? metin(row.tint)
      : (varsayilan?.tint ?? '150,185,235'),
    ...(gorselGecerli
      ? { image: { url, credit, licence } }
      : {}),
    focalX: yuzde(row.focal_x),
    focalY: yuzde(row.focal_y),
    textAlign: row.text_align === 'center' ? 'center' : 'left',
    position: Number.isFinite(Number(row.position)) ? Number(row.position) : 0,
  };
}

function metin(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * 0–100 arası tam sayı; dışındaki her şey merkez (50).
 *
 * `null` VE BOŞ DİZE AYRICA ELENİYOR: `Number(null)` ve `Number('')` `0`
 * verir ve `0` geçerli bir yüzde olduğu için sessizce kabul edilirdi.
 * Sonuç görünürdü — odak noktası merkez yerine görselin SOL/ÜST kenarına
 * yapışır, yani "değer yok" bir kadraj kararına dönüşürdü. Sütun
 * `not null default 50`, ama bu ikinci kapı tam da tablonun başka bir
 * yoldan bozulması ihtimali için var.
 */
function yuzde(v: unknown): number {
  if (v === null || v === undefined || v === '') return 50;
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function guvenliAdres(path: string): boolean {
  if (!path || path.startsWith('//')) return false;
  if (path.startsWith('/')) return true;
  return /^https:\/\/[A-Za-z0-9.-]+(\/[^\s]*)?$/.test(path);
}

/**
 * Odak noktasını CSS `object-position` değerine çevirir.
 *
 * Ayrı fonksiyon: `HeroPhoto`ya yüzdeleri değil hazır dizeyi veriyoruz,
 * böylece "50 50" ile "%50 %50" karışıklığı tek yerde çözülüyor.
 */
export function focalPosition(slide: HeroSlideView): string {
  return `${slide.focalX}% ${slide.focalY}%`;
}
