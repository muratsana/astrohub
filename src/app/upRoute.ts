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
    if (bilinen.has(yol)) return yol;
  }

  return '/';
}
