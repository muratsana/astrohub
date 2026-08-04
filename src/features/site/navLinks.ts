import { legalNav, primaryNav, type NavItem } from '@/app/navigation';

/**
 * MENÜ VE FOOTER BAĞLANTILARI — ZİYARETÇİ TARAFI (§13.2).
 *
 * `nav_links` bu fazın ÜÇÜNCÜ kopuk zinciriydi ve en kötüsüydü: ilk
 * ikisinde (ana sayfa düzeni, bayraklar) en azından panel tarafı
 * çalışıyordu. Burada tablo 0058'de kuruldu, veri katmanı
 * `admin/siteSettings.ts`e yazıldı — sonra hiçbir şey. Tohum yok, panel
 * yüzeyi yok, okuma yok. Üç ucu da açık bir boru.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `nav_links` MENÜYÜ YÖNETİR, `siteMap`i DEĞİL — SINIR BURADA
 *
 * Sitede üç ayrı bağlantı listesi var ve ikisi yönetilebilir, biri
 * DEĞİL:
 *
 *   `primaryNav`  → üst menü                            → YÖNETİLİR
 *   `legalNav`    → footer'ın kurumsal satırı           → YÖNETİLİR
 *   `siteMap`     → tam modül haritası (çekmece, palet) → KODDA KALIR
 *
 * `siteMap` bir menü değil, sitenin ERİŞİLEBİLİRLİK GARANTİSİ.
 * `navigation.ts` bunu kendi başlığında söylüyor: "Üst menüde görünmeyen
 * her sayfa burada görünür olmalıdır — aksi hâlde erişilemez hâle
 * gelir." Panelden düzenlenebilir yapsaydık yönetici, bir sayfaya giden
 * TEK yolu silebilirdi; bu site yönetimi değil, siteyi bozmak olurdu.
 * Üstelik hatanın farkına varmanın yolu yok: sayfa duruyor, rota
 * çalışıyor, yalnızca kimse bulamıyor.
 *
 * Yönetilebilir olan iki liste ise gerçekten menü: sıraları, adları ve
 * hangilerinin görüneceği editoryal karar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YEDEK YİNE "BUGÜNKÜ SİTE"
 *
 * Tablo boşsa, çağrı düşerse ya da Supabase yapılandırılmamışsa koddaki
 * listeler geçerli. Boş menü döndürseydik bir ağ hatası üst çubuğu
 * bomboş bırakırdı — ziyaretçi için sitenin çökmesinden ayırt edilemez.
 */

export interface NavLinkView {
  menu: 'header' | 'footer';
  group_label: string | null;
  label: string;
  path: string;
  position: number;
  new_tab: boolean;
  /** Yalnızca oturum açmışa göster (örn. "Panelim"). */
  auth_only: boolean;
}

/** Koddaki listelerden türetilen yedek. Sıra kodun sırası. */
export const DEFAULT_NAV_LINKS: NavLinkView[] = [
  ...primaryNav.map((item, i) => satir('header', item, i + 1)),
  ...legalNav.map((item, i) => satir('footer', item, i + 1)),
];

function satir(
  menu: 'header' | 'footer',
  item: NavItem,
  position: number
): NavLinkView {
  return {
    menu,
    group_label: null,
    label: item.label,
    path: item.to,
    position,
    new_tab: false,
    auth_only: false,
  };
}

/**
 * Ham satırları çizilecek listeye çevirir.
 *
 * KAPALI BAĞLANTI BURADA DÜŞÜYOR (`enabled`), `home_modules`taki
 * mantığın aynısı: panel kapalı olanı da görmek zorunda (geri açmak
 * için), ziyaretçi görmemeli.
 *
 * BOŞ LİSTE KONTROLÜ SÜZMEDEN ÖNCE: veri gelmemesi arıza (yedek devreye
 * girer), her bağlantıyı kapatmak karar (uygulanır). Aradaki farkı
 * kaybedersek yönetici menüyü boşaltamaz.
 *
 * ADRES DOĞRULAMASI BURADA DA VAR ama güvenlik için değil: veritabanı
 * CHECK'i `javascript:`/`data:` şemalarını zaten reddediyor ve o kapı
 * atlanamaz. Buradaki ikinci kapı, tablonun başka bir yoldan (elle SQL,
 * gelecekteki bir migration) bozulması ihtimaline karşı — menüye giren
 * bozuk bir adres her sayfada görünürdü.
 */
export function toNavLinks(rows: unknown): NavLinkView[] {
  if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_NAV_LINKS;

  const acik = rows
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .filter((r) => r.enabled !== false);

  const gecerli = acik
    .map(normalize)
    .filter((l): l is NavLinkView => l !== null)
    .sort((a, b) => a.position - b.position);
  const tamamlanmis = tamamlaEskiHeaderTohumu(gecerli);

  /* AÇIK SATIR VARDI AMA HİÇBİRİ GEÇERLİ DEĞİLSE veri bozuk → yedek.
     Bu kontrol olmasaydı bozuk bir tablo menüyü sessizce boşaltırdı ve
     sonuç "yönetici hepsini kapattı" durumundan ayırt edilemezdi. */
  if (acik.length > 0 && tamamlanmis.length === 0) return DEFAULT_NAV_LINKS;
  return tamamlanmis;
}

function tamamlaEskiHeaderTohumu(links: NavLinkView[]): NavLinkView[] {
  const header = links.filter((link) => link.menu === 'header');
  const paths = new Set(header.map((link) => link.path));
  const eskiTohum =
    paths.has('/galeri') &&
    paths.has('/etkinlikler') &&
    paths.has('/haberler') &&
    paths.has('/saha');

  if (!eskiTohum) return links;

  if (paths.has('/topluluklar')) return links;

  return links
    .map((link) =>
      link.menu === 'header' && link.position >= 3
        ? { ...link, position: link.position + 1 }
        : link
    )
    .concat(
      satir(
        'header',
        { label: 'Topluluklar', to: '/topluluklar' },
        3
      )
    )
    .sort((a, b) => a.position - b.position);
}

function normalize(row: Record<string, unknown>): NavLinkView | null {
  const path = typeof row.path === 'string' ? row.path.trim() : '';
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label || !guvenliAdres(path)) return null;

  return {
    menu: row.menu === 'footer' ? 'footer' : 'header',
    group_label:
      typeof row.group_label === 'string' && row.group_label.trim()
        ? row.group_label.trim()
        : null,
    label,
    path,
    position: Number.isFinite(Number(row.position)) ? Number(row.position) : 0,
    new_tab: row.new_tab === true,
    auth_only: row.auth_only === true,
  };
}

/**
 * Site içi yol ya da `https://` adresi.
 *
 * `//` ile başlayan adres REDDEDİLİYOR: tarayıcı onu protokol-göreli dış
 * adres sayar, yani `/`la başlıyor diye "site içi" sanmak yanlış olurdu.
 */
export function guvenliAdres(path: string): boolean {
  if (!path || path.startsWith('//')) return false;
  if (path.startsWith('/')) return true;
  return /^https:\/\/[A-Za-z0-9.-]+(\/[^\s]*)?$/.test(path);
}

/**
 * Bir menünün çizilecek bağlantıları.
 *
 * `hiddenPrefixes` bayraklardan geliyor: yönetici üst menüye `/radyo`
 * bağlantısı eklediyse ve `radyo_acik` kapalıysa, bağlantı görünmemeli.
 * İki yapılandırma birbirinden habersiz olsaydı panel kendi kendisiyle
 * çelişirdi — bir yerde kapattığın bölüm başka bir yerde duruyor olurdu.
 */
export function selectMenu(
  links: NavLinkView[],
  menu: 'header' | 'footer',
  options: { signedIn: boolean; hiddenPrefixes?: readonly string[] } = {
    signedIn: false,
  }
): NavLinkView[] {
  const gizli = options.hiddenPrefixes ?? [];
  return links.filter(
    (l) =>
      l.menu === menu &&
      (!l.auth_only || options.signedIn) &&
      !gizli.some((ön) => l.path === ön || l.path.startsWith(`${ön}/`))
  );
}
