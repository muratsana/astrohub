import { allNavItems } from './navigation';

/**
 * ÜST ROTA — "geri" ile "yukarı" aynı şey değil (§6.7, FAZ 11).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖLÇÜLEN SORUN
 *
 * Sayfalardaki geri dönüş `navigate(-1)` ile çalışıyordu. Tarayıcı
 * geçmişi BOŞ olduğunda — paylaşılan bağlantıyla gelen ziyaretçi, yeni
 * sekmede açılan kart, e-postadaki adres — bu çağrı hiçbir şey yapmıyor:
 * kullanıcı düğmeye basar, sayfa durur. Astrohub'da bu sık bir yol,
 * çünkü fotoğraf ve etkinlik adresleri paylaşılmak için var.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÇÖZÜM: HER ROTANIN BİR ÜSTÜ VAR
 *
 * "Yukarı" gezinme geçmişten değil ADRESTEN türüyor: `/galeri/foto/42`
 * → `/galeri`. Böylece geçmiş boş olsa bile gidilecek bir yer kalıyor.
 * Geçmiş doluysa `navigate(-1)` yine tercih ediliyor — kullanıcının
 * geldiği yer, tahmin ettiğimiz yerden her zaman daha doğru.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI TABLO DEĞİL, SEGMENT DÜŞÜRME
 *
 * Elle yazılmış bir "üst rota" tablosu, yeni bir sayfa eklendiğinde
 * güncellenmeyi unutulur ve hata sessizdir (düğme yanlış yere götürür).
 * Segment düşürmek her rota için otomatik çalışıyor; yalnızca düşürülen
 * yolun GERÇEKTEN var olduğunu doğruluyoruz — `siteMap` tek kaynak.
 * Bilinen bir üst yol bulunamazsa ana sayfaya iniyoruz: yanlış bir
 * sayfaya götürmektense bilinen bir yere götürmek.
 */

/**
 * ══════════════════════════════════════════════════════════════════════
 * TEKİL DETAY → ÇOĞUL LİSTE
 *
 * Segment düşürme bir yeri çözemiyor ve bunun canlıda bir bedeli oldu:
 * `/fotograf/<slug>` bir üste inince `/fotograf` çıkıyor, öyle bir
 * sayfa yok ve düğme ANA SAYFAYA gidiyordu. Üstünde "Galeriye dön"
 * yazan bir düğmenin ana sayfayı açması, çalışmamasından beter —
 * kullanıcı bir yere gittiğini sanıyor.
 *
 * Bu yalnızca doğrudan gelen ziyaretçide görülüyor (paylaşılan
 * bağlantı, yeni sekme, yer imi); geçmişi olan kullanıcıda
 * `navigate(-1)` devreye giriyor ve doğru yere gidiyor. Yani hata tam
 * olarak en savunmasız ziyaretçiyi vuruyordu.
 *
 * Rota adları Türkçe olduğu için tekil/çoğul ilişkisi kurallı değil:
 * `fotograf`ın listesi `galeri`, `ilan`ınki `ilanlar`, `hedef`inki
 * `hedefler`. Hiçbir dize işlemi bunu türetemez.
 *
 * Tablo elle yazıldı ama SESSİZCE ÇÜRÜMÜYOR: testi her hedefin
 * `siteMap`te gerçekten var olduğunu doğruluyor.
 */
export const TEKIL_LISTE: Record<string, string> = {
  '/fotograf': '/galeri',
  '/etkinlik': '/etkinlikler',
  '/ilan': '/ilanlar',
  '/haber': '/haberler',
  '/yazi': '/yazilar',
  '/topluluk': '/topluluklar',
  /*
   * `/hedef` BİLEREK YOK. Karşılığı `/hedefler` bir rota olarak var ama
   * `siteMap`te değil — yani gezinmeden ulaşılamıyor. Buraya yazmak,
   * doğrulama kapısına takılıp sessizce ana sayfaya düşmek olurdu.
   * Doğru düzeltme `/hedefler`i site haritasına almak; o ayrı bir karar
   * ve bu hatanın kapsamında değil.
   */
};

/** `siteMap`teki tüm adresler — bir yolun gerçekten var olduğunu doğrular. */
function bilinenYollar(): Set<string> {
  return new Set(allNavItems().map((item) => item.to));
}

/**
 * Ara segmentler: rota parçası olup tek başına sayfası olmayanlar.
 *
 * `/galeri/foto/42` → `/galeri/foto` diye bir sayfa YOK; bir üst adım
 * daha atılmalı. Liste yerine "bilinen yollar" kümesine bakmak bunu
 * kendiliğinden hallediyor — burası yalnızca döngüyü kaç kez
 * çalıştıracağımızı sınırlıyor.
 */
const EN_FAZLA_ADIM = 4;

export function upRoute(pathname: string): string {
  const bilinen = bilinenYollar();
  let yol = pathname.replace(/\/+$/, '');

  for (let adim = 0; adim < EN_FAZLA_ADIM; adim += 1) {
    const kesim = yol.lastIndexOf('/');
    if (kesim <= 0) return '/';
    yol = yol.slice(0, kesim);
    /*
     * Tekil detay önekinin listesi önce sorulur: `/fotograf` bilinen
     * yollar arasında yok ama karşılığı `/galeri` var.
     *
     * Hedef yine de `bilinen` kümesinden geçiyor. Tablo elle yazıldığı
     * için bir gün var olmayan bir adres yazılabilir; kontrol olmasa
     * düğme "düzeltilmiş" görünüp boşluğa götürürdü. Kontrol sayesinde
     * böyle bir satır testte düşüyor.
     */
    const liste = TEKIL_LISTE[yol];
    if (liste && bilinen.has(liste)) return liste;
    if (bilinen.has(yol)) return yol;
  }

  return '/';
}
