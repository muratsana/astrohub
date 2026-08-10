/**
 * ESKİ SÜRÜM AÇIK SEKMEDE KALDIĞINDA (§16.4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖLÇÜLEN HATA
 *
 * Uygulama modülleri parça parça, `import()` ile indiriliyor: Supabase
 * istemcisi, yönetim paneli, editör… Yeni bir sürüm yayımlandığında bu
 * parçaların dosya adları değişiyor (içerik özetli isimler) ve eskileri
 * sunucudan kalkıyor.
 *
 * Sekmesi açık kalan kullanıcı bunu şöyle yaşıyordu: sayfa çalışmaya
 * devam ediyor, ama ilk kez ihtiyaç duyulan bir parça indirilemiyor ve
 * ekranda ham tarayıcı hatası beliriyor —
 *
 *     TypeError: Failed to fetch
 *
 * Yönetim panelinde tam olarak bu görüldü: "İçerik yönetimi" ve
 * "Haftanın Fotoğrafı" kutuları veri yerine bu metni gösterdi. Cümle
 * kullanıcıya hiçbir şey anlatmıyor; ne olduğunu (yeni sürüm çıktı) ve
 * ne yapması gerektiğini (yenile) söylemiyor. Daha kötüsü, veritabanı
 * arızası sanılıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN OTOMATİK YENİLEME, SORU SORMAK DEĞİL
 *
 * Kullanıcının yapabileceği tek şey yenilemek; ona bunu sormak, tek
 * seçenekli bir soru sormaktır. Yenileme SESSİZ de değil: sayfa
 * yenilenmeden önce kısa bir bildirim basılıyor, çünkü form doldurmakta
 * olan biri sayfanın kendiliğinden yenilendiğini anlamalı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÖNGÜ KORUMASI ŞART
 *
 * Yenileme de aynı hatayı verirse (ağ gerçekten kopuksa, sunucu
 * bozuksa) sayfa sonsuz döngüye girerdi. `sessionStorage` işareti bunu
 * bir kereye indiriyor: ikinci kez olursa yenilemiyoruz ve hata olduğu
 * gibi görünür kalıyor — sonsuz yenilenen bir sayfa, hatalı bir
 * sayfadan çok daha kötü.
 */

const ISARET = 'astrohub:eski-surum-yenilendi';

export function watchStaleBuild(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', (event) => {
    /* Vite'ın kendi yeniden deneme mantığı varsa ona bırakmıyoruz:
       parça sunucudan kalktıysa tekrar denemek de düşer. */
    event.preventDefault();

    let denendi = false;
    try {
      denendi = sessionStorage.getItem(ISARET) === '1';
      sessionStorage.setItem(ISARET, '1');
    } catch {
      /* Depo kapalıysa koruma da yok; tek yenileme denemesi yapıp
         bırakmak, hiç denememekten iyi. */
    }

    if (denendi) return;
    window.location.reload();
  });

  /* Yenileme başarılıysa işaret siliniyor, yoksa kullanıcı bir daha ki
     sürümde korumasız kalırdı. */
  window.addEventListener('load', () => {
    try {
      sessionStorage.removeItem(ISARET);
    } catch {
      /* önemsiz */
    }
  });
}
