import type { Profile } from '@/services/content/profile';

/**
 * HESAP KURULUMU TAMAM MI — tek kural kaynağı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI DOSYA
 *
 * Aynı soruyu üç yer soruyor: kurulum kapısı (ekranı kaplayan modal),
 * hesap sayfası (kilit uyarısı) ve ileride kullanıcı dizini (eksik
 * profilleri listelememek için). Üçü kendi koşulunu yazsaydı, "il de
 * zorunlu olsun" kararı iki yerde uygulanır, birinde unutulurdu.
 *
 * Kurallar SAF: profil nesnesi dışında hiçbir şeye bakmıyorlar, bu
 * yüzden ağ olmadan sınanabiliyorlar.
 */

/**
 * Kayıtta üretilen `user_xxxx` adı mı?
 *
 * DESEN `app.uretilmis_kullanici_adi()` İLE AYNI OLMALI. İki taraf
 * ayrıldığında ortaya çıkan şey sessiz: veritabanı "bu ad üretilmiş,
 * değiştirebilir" derken arayüz "seçilmiş, kilitli" derse kullanıcı
 * kilidi görür ama kilit aslında yoktur — ya da tersi, tek hakkını
 * farkında olmadan harcar.
 *
 * `handle_new_user()` adı `substr(replace(id::text,'-',''), 1, 12)` ile
 * kuruyor: her zaman 12 onaltılık karakter.
 */
export function isGeneratedUsername(username: string): boolean {
  return /^user_[0-9a-f]{12}$/.test(username);
}

/**
 * Kullanıcı adı KİLİTLİ Mİ — bir daha değiştirilemez mi?
 *
 * Kilit `username_customized_at` damgasında; damgayı sunucu basıyor.
 * Arayüz burada yalnızca ANLATIYOR: yaptırım `app
 * .profiles_username_kilidi` tetikleyicisinde.
 */
export function isUsernameLocked(profile: Profile | null): boolean {
  return !!profile?.usernameCustomizedAt;
}

/**
 * Zorunlu profil alanları dolu mu?
 *
 * İKİ ALAN: kullanıcı adı ve il.
 *
 * Kullanıcı adı zorunlu çünkü profil ADRESİ o — `user_16206d94efc3`
 * çalışan bir adres ama kimsenin paylaşmak isteyeceği bir adres değil,
 * ve canlıdaki sekiz hesabın dördü bu adla geziyordu.
 *
 * İl zorunlu çünkü sitenin yarısı konuma bağlı: bu gece gökyüzünde,
 * karanlık pencere, yakındaki gözlem noktaları, şehir sayfaları, ikinci
 * el ilanlarının mesafesi. İlsiz bir hesap bu ekranların hepsinde
 * "önce şehir seçin" diyen bir boşluk görüyor.
 *
 * İLÇE ZORUNLU DEĞİL: il, yukarıdaki her hesap için yeterli hassasiyet
 * ve ilçe istemek konumunu paylaşmak istemeyen kullanıcıyı gereksiz
 * yere zorlamak olurdu.
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return true;
  if (isGeneratedUsername(profile.username)) return false;
  return !!profile.city?.trim();
}

/** Kurulum kapısının hangi alanları istediği — ekranda tek tek sayılıyor. */
export function missingProfileFields(profile: Profile | null): string[] {
  if (!profile) return [];
  const eksik: string[] = [];
  if (isGeneratedUsername(profile.username)) eksik.push('kullanıcı adı');
  if (!profile.city?.trim()) eksik.push('şehir');
  return eksik;
}
