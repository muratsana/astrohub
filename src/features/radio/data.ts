import type { RadioTrack } from './types';

/**
 * RADYO YAYIN LİSTESİ — SİTE YAYINI, TOPLULUK KUYRUĞU DEĞİL.
 *
 * Programı Astrohub editör ekibi yapar; dinleyici parça yükleyemez.
 * Yetki veritabanı seviyesinde de böyle: `radio` bucket'ına yazma ve
 * (0006 ile) okuma politikası editör rolüne bağlıdır — yani kural yalnızca
 * arayüzde yazan bir cümle değil.
 *
 * Sebebi lisans: çalınan her kaydın hakkının kimde olduğunu tek bir yerin
 * izlemesi gerekir. Herkesin yükleyebildiği bir yayında sorumluluk kimsede
 * olmaz.
 *
 * Liste **kasıtlı olarak boş** başlar. Sitede henüz yüklenmiş bir MP3 yok ve
 * gerçekte var olmayan parçaları örnek diye yazmak, arayüzü dolu gösterip
 * çalmaya basınca 404 vermekten başka bir işe yaramazdı.
 *
 * Editörün parça eklemesinin iki yolu:
 *
 *   1. MP3 — dosyayı Supabase `radio` bucket'ına yükler, genel URL'i
 *      aşağıdaki listeye `source: 'mp3'` olarak ekler. (Kalıcı çözüm:
 *      `radio_tracks` tablosu — bkz. supabase/migrations/0004.)
 *
 *   2. Spotify — parçanın "Share → Copy link" adresini `source: 'spotify'`
 *      olarak ekler. Spotify parçaları gömülü oynatıcıda çalar; MP3
 *      sırasına karışmaz (nedeni `types.ts`'te yazılı).
 *
 * Örnek satır:
 *
 *   {
 *     id: 'nocturne-01',
 *     title: 'Nocturne',
 *     artist: 'Kayıt Sahibi',
 *     source: 'mp3',
 *     url: 'https://<proje>.supabase.co/storage/v1/object/public/radio/nocturne.mp3',
 *     note: 'yavaş tempo, vokalsiz',
 *   },
 */
export const radioTracks: RadioTrack[] = [];

/**
 * Yayına alınan kayıtların uyması beklenen ölçütler. Sayfada gösterilir —
 * dinleyici, listenin neye göre seçildiğini bilsin diye.
 */
export const radioGuidelines = [
  'Gece çekimi arka planı: yavaş tempo, ani yükselen bölümler olmadan.',
  'Vokalsiz ya da düşük vokal — konsantrasyonu bölmeyen kayıtlar tercih edilir.',
  'Yalnızca hakkına sahip olduğunuz ya da açık lisanslı (CC) kayıtlar.',
  'MP3, 128–256 kbps. Daha yükseği saha koşullarında mobil veriyi yakar.',
];
