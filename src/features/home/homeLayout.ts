import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

/**
 * ANA SAYFA DÜZENİ — ZİYARETÇİ TARAFI (§13.2).
 *
 * Yönetici panelden modülleri sıralıyor, kapatıyor, sayılarını
 * değiştiriyor ve yayın penceresi veriyordu; ana sayfa bunların HİÇBİRİNİ
 * okumuyordu. Panel yüzeyi, RPC'ler, taslak/yayımlama akışı ve değişiklik
 * geçmişi hazırdı ama zincirin son halkası yoktu: yönetici "galeri
 * modülünü kapat" diyor, ziyaretçi galeriyi görmeye devam ediyordu.
 * Burası o halka.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OKUMA YOLU `home_layout`, `home_modules_admin` DEĞİL
 *
 * İkisi bilerek ayrı (bkz. `admin/siteSettings.ts`). Ziyaretçi yayın
 * penceresini UYGULAYAN yolu okur: ileri tarihli modül burada
 * görünmemeli. Panelin okuduğu yol pencereyi uygulamaz — yönetici kendi
 * kurduğu zamanlamayı geri alabilsin diye.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YEDEK, "BOŞ SAYFA" DEĞİL "BUGÜNKÜ SAYFA"
 *
 * Supabase yapılandırılmamışsa, çağrı düşerse ya da tablo boşsa
 * `DEFAULT_HOME_LAYOUT` devreye giriyor. Yedeğin BOŞ liste olması ana
 * sayfayı bir ağ hatasında bomboş bırakırdı — ziyaretçi için bu, sitenin
 * çökmesinden ayırt edilemez. Yedek, bugün canlıda ne varsa o.
 *
 * Aynı sebeple yedek `useState`in BAŞLANGIÇ değeri: ilk boyamada düzen
 * hazır, veri gelince yerini alıyor. `null` ile başlayıp "yükleniyor"
 * çizseydik ana sayfa her açılışta bir kare boş kalırdı ve prerender
 * edilmiş HTML de o boşluğu taşırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAYILAR VERİTABANINDAN, KODDAN DEĞİL — AMA İKİSİ HİZALI BAŞLIYOR
 *
 * 0058'in tohumu kör yazılmıştı: `records` için 6, `listings` için 4
 * diyordu; canlıdaki kod ise 10 ve 5 çiziyordu. Başlıklarda da aynı
 * kayma vardı — tohum 'Son ilanlar' derken ekranda 'Son İlanlar'
 * yazıyordu. Bu katman bağlanırken veritabanı doğru kabul edilseydi, hiç
 * kimse istemediği hâlde ana sayfa değişirdi.
 *
 * 0061 ikisini de düzeltti: sayıları koda hizaladı, tohum başlıklarını
 * `null`a çekti (`null` = "geçersiz kılma yok, sayfanın kendi başlığı").
 * Yapılandırma katmanı ilk gün DAVRANIŞI KORUR, sonrasında yöneticiye
 * devreder.
 */

export interface HomeModuleView {
  key: string;
  title: string | null;
  subtitle: string | null;
  /**
   * Modülün açma/kapama anahtarı — panelde "Açık" kutusu (§13.2).
   *
   * `home_layout` bu sütunu DÖNDÜRÜYOR ama SÜZMÜYOR: yayın penceresi
   * `where`de uygulanıyor, `enabled` uygulanmıyor. Süzme burada; kapalı
   * modül `toHomeLayout`tan hiç çıkmıyor. Sütunu okumasaydık panelin en
   * belirgin kontrolü — bir modülü kapatmak — ziyaretçi tarafında
   * hiçbir şey yapmazdı.
   */
  enabled: boolean;
  position: number;
  item_limit: number;
  layout: 'grid' | 'list';
  hide_when_empty: boolean;
  show_mobile: boolean;
  show_desktop: boolean;
}

/**
 * Yedek düzen — bugünkü canlı davranışın birebir kopyası.
 *
 * Sayılar bölüm bileşenlerindeki sabitlerle aynı: `records` 10
 * (`KAC_KART`), `news` 4 (`ROWS`), `events` 5, `listings` 5.
 */
export const DEFAULT_HOME_LAYOUT: HomeModuleView[] = [
  m('hero', 1, 1),
  m('tonight', 2, 1),
  m('records', 3, 10),
  m('news', 4, 4),
  m('events', 5, 5, 'list'),
  m('listings', 6, 5),
  m('weekly_photo', 7, 1),
];

function m(
  key: string,
  position: number,
  item_limit: number,
  layout: 'grid' | 'list' = 'grid'
): HomeModuleView {
  return {
    key,
    title: null,
    subtitle: null,
    enabled: true,
    position,
    item_limit,
    layout,
    hide_when_empty: true,
    show_mobile: true,
    show_desktop: true,
  };
}

/**
 * Gelen satırı güvenli hâle getirir.
 *
 * RPC'nin sözleşmesine güveniyoruz ama bu veri YÖNETİCİ TARAFINDAN
 * YAZILIYOR ve tek bir bozuk satır ana sayfayı düşürebilir. `item_limit`
 * 0 ya da negatifse bölüm boş çizerdi; `position` yoksa sıralama
 * rastgeleleşirdi. Veritabanındaki CHECK'ler bunları zaten engelliyor —
 * buradaki ikinci kapı, tablonun başka bir yoldan (elle SQL, gelecekteki
 * bir migration) bozulması ihtimaline karşı.
 */
function normalize(row: Record<string, unknown>, index: number): HomeModuleView {
  const varsayilan = DEFAULT_HOME_LAYOUT.find((d) => d.key === row.key);
  const sayi = Number(row.item_limit);
  return {
    key: String(row.key),
    title: typeof row.title === 'string' ? row.title : null,
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : null,
    position: Number.isFinite(Number(row.position))
      ? Number(row.position)
      : (varsayilan?.position ?? index + 1),
    item_limit:
      Number.isFinite(sayi) && sayi > 0
        ? Math.floor(sayi)
        : (varsayilan?.item_limit ?? 4),
    layout: row.layout === 'list' ? 'list' : 'grid',
    /* Yalnızca AÇIKÇA `false` kapatır. Alan hiç gelmezse (eski bir RPC
       sürümü, elle yazılmış satır) modül açık sayılıyor: bir okuma
       eksiğini "yönetici bunu kapattı" kararına çevirmek, ana sayfayı
       sessizce boşaltmanın en kolay yolu olurdu. */
    enabled: row.enabled !== false,
    hide_when_empty: row.hide_when_empty !== false,
    show_mobile: row.show_mobile !== false,
    show_desktop: row.show_desktop !== false,
  };
}

/**
 * Ham RPC çıktısını çizilecek sıralı listeye çevirir.
 *
 * Ayrı bir fonksiyon: kancanın içinde kalsaydı ölçmek için React
 * render etmek gerekirdi.
 *
 * KAPALI MODÜL BURADA DÜŞÜYOR. `home_layout` yayın penceresini `where`de
 * uyguluyor ama `enabled`ı süzmüyor — sütunu döndürüp kararı çağırana
 * bırakıyor, çünkü panelin okuduğu yol kapalı modülleri de görmek
 * zorunda (kapalıyı geri açmak için listede durması gerekir). Ziyaretçi
 * yolunda o kararın cevabı: çizme.
 *
 * "HEPSİ KAPALI" YEDEĞE DÜŞMEZ. Boş liste kontrolü SÜZMEDEN ÖNCE, çünkü
 * iki boşluk aynı şey değil: veri gelmemesi bir arıza (yedek devreye
 * girer), her modülü kapatmak bir KARAR (uygulanır). Süzmeden sonra
 * baksaydık yönetici ana sayfayı boşaltamaz, kapattığı modüller
 * inatla geri gelirdi.
 */
export function toHomeLayout(rows: unknown): HomeModuleView[] {
  if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_HOME_LAYOUT;
  return rows
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .map(normalize)
    .filter((m) => m.enabled)
    .sort((a, b) => a.position - b.position);
}

export function useHomeLayout(): HomeModuleView[] {
  const [layout, setLayout] = useState<HomeModuleView[]>(DEFAULT_HOME_LAYOUT);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;
        const { data, error } = await supabase.rpc('home_layout', {
          onizleme: false,
        });
        if (!active || error) return;
        setLayout(toHomeLayout(data));
      } catch {
        /* Yedek düzen zaten ekranda — gerekçe dosya başında. */
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return layout;
}

/**
 * Mobil/masaüstü görünürlüğünü CSS'e çevirir.
 *
 * NEDEN CSS, `useIsNarrow` DEĞİL: burada iki düzen aynı anda DOM'da
 * DURMUYOR, tek bir bölüm gizleniyor. CSS ile yapınca prerender edilmiş
 * HTML doğru kalıyor ve JavaScript gelmeden önce de doğru şey görünüyor.
 * Kanca kullansaydık statik HTML "geniş" varsayacağı için yalnızca
 * mobile ayarlı bir modül önce görünüp sonra kaybolurdu.
 *
 * Kırılma noktası `sm` (640px) — `useIsNarrow`un varsayılanı olan
 * `max-width: 639px` ile aynı sınır.
 */
export function visibilityClass(modul: HomeModuleView): string | undefined {
  if (!modul.show_mobile && !modul.show_desktop) return 'hidden';
  if (!modul.show_mobile) return 'hidden sm:block';
  if (!modul.show_desktop) return 'sm:hidden';
  return undefined;
}
