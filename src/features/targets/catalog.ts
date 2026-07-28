// Göreli yol: bkz. data.ts — bu modül vite.config.ts zincirinden de yükleniyor.
import type { TargetKind } from '../../domain/targets/derive';

/**
 * HEDEF KATALOĞU — KAYNAK VERİ.
 *
 * Burada yalnızca **ölçülen** değerler var: katalog kodu, tür, takımyıldız,
 * sağ açıklık, dik açıklık, kadir, açısal boyut. "En uygun ay", "önerilen
 * odak", "zorluk", "kart gradyanı" gibi her şey bu satırlardan
 * `domain/targets/derive.ts` içinde hesaplanıyor.
 *
 * Neden sıkışık bir tablo? 200'den fazla kayıt için nesne söz dizimi
 * dosyayı 4000 satıra çıkarır ve bir kadir hatasını gözle bulmak imkânsız
 * hâle gelir. Sabit sütun düzeninde yan yana duran sayılar, yanlış girilmiş
 * bir dik açıklığı bakışta ele veriyor.
 *
 * KAYNAKLAR: Messier ve NGC/IC değerleri SIMBAD/NED üzerinden yayımlanan
 * standart katalog değerleridir; açısal boyutlar görsel/fotoğrafik yaygın
 * kabul gören ölçülerdir ve kaynağa göre bir miktar değişir — bu yüzden
 * kadraj hesaplarında yaklaşık değer olarak kullanılmalıdır.
 */

export interface CatalogRow {
  /** Birincil katalog kodu, boşluklu: "M 31", "NGC 7000". */
  code: string;
  /** Diğer katalog kodları. */
  aliases?: string[];
  kind: TargetKind;
  /** Takımyıldız — Türkçe adı. */
  constellation: string;
  /** Sağ açıklık, saat (J2000). */
  ra: number;
  /** Dik açıklık, derece (J2000). */
  dec: number;
  /** Görünür kadir; bilinmiyorsa yok. */
  mag?: number;
  /** Açısal boyut, yay dakikası: "178x63" ya da "20". */
  size: string;
  /** Türkçe yaygın ad. Yoksa türden üretilir. */
  name?: string;
  /**
   * Eski kayıtların bağlantısını kırmamak için sabitlenmiş slug.
   * Verilmezse katalog kodundan üretilir.
   */
  slug?: string;
  /** Kaynağa özel not — türetilen metinlerin söyleyemeyeceği şeyler. */
  note?: string;
}

/* ────────────────────────────  MESSIER 1–110  ──────────────────────────── */

export const messier: CatalogRow[] = [
  { code: 'M 1', aliases: ['NGC 1952'], kind: 'sungerimsi-kalinti', constellation: 'Boğa', ra: 5.575, dec: 22.017, mag: 8.4, size: '6x4', name: 'Yengeç Bulutsusu', note: '1054 yılında Çinli gökbilimcilerin kaydettiği süpernovanın kalıntısı.' },
  { code: 'M 2', aliases: ['NGC 7089'], kind: 'kuresel-kume', constellation: 'Kova', ra: 21.558, dec: -0.823, mag: 6.5, size: '16' },
  { code: 'M 3', aliases: ['NGC 5272'], kind: 'kuresel-kume', constellation: 'Av Köpekleri', ra: 13.703, dec: 28.377, mag: 6.2, size: '18' },
  { code: 'M 4', aliases: ['NGC 6121'], kind: 'kuresel-kume', constellation: 'Akrep', ra: 16.393, dec: -26.526, mag: 5.6, size: '26' },
  { code: 'M 5', aliases: ['NGC 5904'], kind: 'kuresel-kume', constellation: 'Yılan', ra: 15.309, dec: 2.081, mag: 5.6, size: '23' },
  { code: 'M 6', aliases: ['NGC 6405'], kind: 'acik-kume', constellation: 'Akrep', ra: 17.671, dec: -32.217, mag: 4.2, size: '25', name: 'Kelebek Kümesi' },
  { code: 'M 7', aliases: ['NGC 6475'], kind: 'acik-kume', constellation: 'Akrep', ra: 17.897, dec: -34.793, mag: 3.3, size: '80', name: 'Ptolemy Kümesi' },
  { code: 'M 8', aliases: ['NGC 6523'], kind: 'emisyon-bulutsusu', constellation: 'Yay', ra: 18.06, dec: -24.383, mag: 6.0, size: '90x40', name: 'Lagün Bulutsusu' },
  { code: 'M 9', aliases: ['NGC 6333'], kind: 'kuresel-kume', constellation: 'Yılancı', ra: 17.319, dec: -18.516, mag: 7.7, size: '12' },
  { code: 'M 10', aliases: ['NGC 6254'], kind: 'kuresel-kume', constellation: 'Yılancı', ra: 16.952, dec: -4.1, mag: 6.6, size: '20' },
  { code: 'M 11', aliases: ['NGC 6705'], kind: 'acik-kume', constellation: 'Kalkan', ra: 18.851, dec: -6.27, mag: 6.3, size: '14', name: 'Yaban Ördeği Kümesi' },
  { code: 'M 12', aliases: ['NGC 6218'], kind: 'kuresel-kume', constellation: 'Yılancı', ra: 16.787, dec: -1.948, mag: 6.7, size: '16' },
  { code: 'M 13', aliases: ['NGC 6205'], kind: 'kuresel-kume', constellation: 'Herkül', ra: 16.695, dec: 36.46, mag: 5.8, size: '20', name: 'Herkül Küresel Kümesi', slug: 'm13-herkul' },
  { code: 'M 14', aliases: ['NGC 6402'], kind: 'kuresel-kume', constellation: 'Yılancı', ra: 17.626, dec: -3.246, mag: 7.6, size: '11' },
  { code: 'M 15', aliases: ['NGC 7078'], kind: 'kuresel-kume', constellation: 'Pegasus', ra: 21.5, dec: 12.167, mag: 6.2, size: '18', name: 'Pegasus Kümesi' },
  { code: 'M 16', aliases: ['NGC 6611'], kind: 'emisyon-bulutsusu', constellation: 'Yılan', ra: 18.313, dec: -13.792, mag: 6.0, size: '35x28', name: 'Kartal Bulutsusu', note: 'Hubble\'ın "Yaratılış Sütunları" karesi bu bulutsunun merkezindedir.' },
  { code: 'M 17', aliases: ['NGC 6618'], kind: 'emisyon-bulutsusu', constellation: 'Yay', ra: 18.346, dec: -16.177, mag: 6.0, size: '46x37', name: 'Omega Bulutsusu' },
  { code: 'M 18', aliases: ['NGC 6613'], kind: 'acik-kume', constellation: 'Yay', ra: 18.333, dec: -17.133, mag: 7.5, size: '9' },
  { code: 'M 19', aliases: ['NGC 6273'], kind: 'kuresel-kume', constellation: 'Yılancı', ra: 17.043, dec: -26.268, mag: 6.8, size: '17' },
  { code: 'M 20', aliases: ['NGC 6514'], kind: 'emisyon-bulutsusu', constellation: 'Yay', ra: 18.038, dec: -22.972, mag: 6.3, size: '28', name: 'Trifid Bulutsusu' },
  { code: 'M 21', aliases: ['NGC 6531'], kind: 'acik-kume', constellation: 'Yay', ra: 18.07, dec: -22.5, mag: 5.9, size: '13' },
  { code: 'M 22', aliases: ['NGC 6656'], kind: 'kuresel-kume', constellation: 'Yay', ra: 18.606, dec: -23.905, mag: 5.1, size: '32', name: 'Yay Kümesi' },
  { code: 'M 23', aliases: ['NGC 6494'], kind: 'acik-kume', constellation: 'Yay', ra: 17.945, dec: -18.985, mag: 5.5, size: '27' },
  { code: 'M 24', aliases: ['IC 4715'], kind: 'yildiz-bulutu', constellation: 'Yay', ra: 18.283, dec: -18.55, mag: 4.6, size: '90x40', name: 'Yay Yıldız Bulutu' },
  { code: 'M 25', aliases: ['IC 4725'], kind: 'acik-kume', constellation: 'Yay', ra: 18.529, dec: -19.25, mag: 4.6, size: '32' },
  { code: 'M 26', aliases: ['NGC 6694'], kind: 'acik-kume', constellation: 'Kalkan', ra: 18.752, dec: -9.387, mag: 8.0, size: '15' },
  { code: 'M 27', aliases: ['NGC 6853'], kind: 'gezegenimsi-bulutsu', constellation: 'Küçük Tilki', ra: 19.994, dec: 22.721, mag: 7.5, size: '8x6', name: 'Dambıl Bulutsusu' },
  { code: 'M 28', aliases: ['NGC 6626'], kind: 'kuresel-kume', constellation: 'Yay', ra: 18.409, dec: -24.87, mag: 6.8, size: '11' },
  { code: 'M 29', aliases: ['NGC 6913'], kind: 'acik-kume', constellation: 'Kuğu', ra: 20.397, dec: 38.508, mag: 7.1, size: '7' },
  { code: 'M 30', aliases: ['NGC 7099'], kind: 'kuresel-kume', constellation: 'Oğlak', ra: 21.673, dec: -23.18, mag: 7.7, size: '12' },
  { code: 'M 31', aliases: ['NGC 224'], kind: 'galaksi', constellation: 'Andromeda', ra: 0.712, dec: 41.269, mag: 3.4, size: '178x63', name: 'Andromeda Galaksisi', slug: 'm31-andromeda', note: 'Çıplak gözle görülebilen en uzak gökcisimlerinden; 178 yay dakikası genişliğiyle kısa odaklarda bile kadrajı doldurur.' },
  { code: 'M 32', aliases: ['NGC 221'], kind: 'galaksi', constellation: 'Andromeda', ra: 0.711, dec: 40.866, mag: 8.1, size: '8x6' },
  { code: 'M 33', aliases: ['NGC 598'], kind: 'galaksi', constellation: 'Üçgen', ra: 1.564, dec: 30.66, mag: 5.7, size: '71x42', name: 'Üçgen Galaksisi' },
  { code: 'M 34', aliases: ['NGC 1039'], kind: 'acik-kume', constellation: 'Perseus', ra: 2.702, dec: 42.767, mag: 5.5, size: '35' },
  { code: 'M 35', aliases: ['NGC 2168'], kind: 'acik-kume', constellation: 'İkizler', ra: 6.148, dec: 24.336, mag: 5.3, size: '28' },
  { code: 'M 36', aliases: ['NGC 1960'], kind: 'acik-kume', constellation: 'Arabacı', ra: 5.6, dec: 34.14, mag: 6.3, size: '12' },
  { code: 'M 37', aliases: ['NGC 2099'], kind: 'acik-kume', constellation: 'Arabacı', ra: 5.873, dec: 32.553, mag: 6.2, size: '24' },
  { code: 'M 38', aliases: ['NGC 1912'], kind: 'acik-kume', constellation: 'Arabacı', ra: 5.478, dec: 35.855, mag: 7.4, size: '21' },
  { code: 'M 39', aliases: ['NGC 7092'], kind: 'acik-kume', constellation: 'Kuğu', ra: 21.531, dec: 48.433, mag: 4.6, size: '32' },
  { code: 'M 40', aliases: ['Winnecke 4'], kind: 'cift-yildiz', constellation: 'Büyük Ayı', ra: 12.37, dec: 58.083, mag: 8.4, size: '0.8', note: 'Messier\'in katalog hatası: bulutsu sandığı nesne aslında iki yıldızdan ibaret.' },
  { code: 'M 41', aliases: ['NGC 2287'], kind: 'acik-kume', constellation: 'Büyük Köpek', ra: 6.767, dec: -20.717, mag: 4.5, size: '38' },
  { code: 'M 42', aliases: ['NGC 1976'], kind: 'emisyon-bulutsusu', constellation: 'Avcı', ra: 5.588, dec: -5.391, mag: 4.0, size: '85x60', name: 'Orion Bulutsusu', slug: 'm42-orion', note: 'Çekirdeği kanatlar; kısa ve uzun pozları harmanlayan HDR yığını gerekir.' },
  { code: 'M 43', aliases: ['NGC 1982'], kind: 'emisyon-bulutsusu', constellation: 'Avcı', ra: 5.593, dec: -5.27, mag: 9.0, size: '20x15', name: 'De Mairan Bulutsusu' },
  { code: 'M 44', aliases: ['NGC 2632'], kind: 'acik-kume', constellation: 'Yengeç', ra: 8.673, dec: 19.983, mag: 3.7, size: '95', name: 'Yemlik (Praesepe)' },
  { code: 'M 45', kind: 'acik-kume', constellation: 'Boğa', ra: 3.79, dec: 24.117, mag: 1.6, size: '110', name: 'Ülker (Pleiades)', note: 'Yıldızları saran mavi yansıma bulutsusu ancak karanlık gökyüzünde ve uzun toplam sürede belirir.' },
  { code: 'M 46', aliases: ['NGC 2437'], kind: 'acik-kume', constellation: 'Pupa', ra: 7.696, dec: -14.817, mag: 6.1, size: '27', note: 'Küme içinde görünen NGC 2438 gezegenimsi bulutsusu aslında ön planda, kümeye ait değil.' },
  { code: 'M 47', aliases: ['NGC 2422'], kind: 'acik-kume', constellation: 'Pupa', ra: 7.61, dec: -14.487, mag: 4.4, size: '30' },
  { code: 'M 48', aliases: ['NGC 2548'], kind: 'acik-kume', constellation: 'Hidra', ra: 8.228, dec: -5.8, mag: 5.8, size: '54' },
  { code: 'M 49', aliases: ['NGC 4472'], kind: 'galaksi', constellation: 'Başak', ra: 12.497, dec: 8.0, mag: 8.4, size: '10x8' },
  { code: 'M 50', aliases: ['NGC 2323'], kind: 'acik-kume', constellation: 'Tek Boynuzlu At', ra: 7.053, dec: -8.337, mag: 5.9, size: '16' },
  { code: 'M 51', aliases: ['NGC 5194'], kind: 'galaksi', constellation: 'Av Köpekleri', ra: 13.498, dec: 47.195, mag: 8.4, size: '11x7', name: 'Girdap Galaksisi' },
  { code: 'M 52', aliases: ['NGC 7654'], kind: 'acik-kume', constellation: 'Kraliçe', ra: 23.404, dec: 61.593, mag: 6.9, size: '13' },
  { code: 'M 53', aliases: ['NGC 5024'], kind: 'kuresel-kume', constellation: 'Berenis Saçı', ra: 13.216, dec: 18.168, mag: 7.6, size: '13' },
  { code: 'M 54', aliases: ['NGC 6715'], kind: 'kuresel-kume', constellation: 'Yay', ra: 18.918, dec: -30.478, mag: 7.6, size: '12' },
  { code: 'M 55', aliases: ['NGC 6809'], kind: 'kuresel-kume', constellation: 'Yay', ra: 19.667, dec: -30.965, mag: 6.3, size: '19' },
  { code: 'M 56', aliases: ['NGC 6779'], kind: 'kuresel-kume', constellation: 'Çalgı', ra: 19.277, dec: 30.183, mag: 8.3, size: '7' },
  { code: 'M 57', aliases: ['NGC 6720'], kind: 'gezegenimsi-bulutsu', constellation: 'Çalgı', ra: 18.893, dec: 33.029, mag: 8.8, size: '1.4x1', name: 'Halka Bulutsusu' },
  { code: 'M 58', aliases: ['NGC 4579'], kind: 'galaksi', constellation: 'Başak', ra: 12.629, dec: 11.818, mag: 9.7, size: '6x5' },
  { code: 'M 59', aliases: ['NGC 4621'], kind: 'galaksi', constellation: 'Başak', ra: 12.7, dec: 11.647, mag: 9.6, size: '5x3.5' },
  { code: 'M 60', aliases: ['NGC 4649'], kind: 'galaksi', constellation: 'Başak', ra: 12.728, dec: 11.553, mag: 8.8, size: '7x6' },
  { code: 'M 61', aliases: ['NGC 4303'], kind: 'galaksi', constellation: 'Başak', ra: 12.365, dec: 4.473, mag: 9.7, size: '6x5.5' },
  { code: 'M 62', aliases: ['NGC 6266'], kind: 'kuresel-kume', constellation: 'Yılancı', ra: 17.02, dec: -30.113, mag: 6.5, size: '15' },
  { code: 'M 63', aliases: ['NGC 5055'], kind: 'galaksi', constellation: 'Av Köpekleri', ra: 13.264, dec: 42.03, mag: 8.6, size: '12x8', name: 'Ayçiçeği Galaksisi' },
  { code: 'M 64', aliases: ['NGC 4826'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.945, dec: 21.683, mag: 8.5, size: '10x5', name: 'Kara Göz Galaksisi' },
  { code: 'M 65', aliases: ['NGC 3623'], kind: 'galaksi', constellation: 'Aslan', ra: 11.316, dec: 13.092, mag: 9.3, size: '10x3' },
  { code: 'M 66', aliases: ['NGC 3627'], kind: 'galaksi', constellation: 'Aslan', ra: 11.337, dec: 12.991, mag: 8.9, size: '9x4' },
  { code: 'M 67', aliases: ['NGC 2682'], kind: 'acik-kume', constellation: 'Yengeç', ra: 8.855, dec: 11.8, mag: 6.1, size: '30' },
  { code: 'M 68', aliases: ['NGC 4590'], kind: 'kuresel-kume', constellation: 'Hidra', ra: 12.657, dec: -26.744, mag: 7.8, size: '12' },
  { code: 'M 69', aliases: ['NGC 6637'], kind: 'kuresel-kume', constellation: 'Yay', ra: 18.523, dec: -32.348, mag: 7.6, size: '9.8' },
  { code: 'M 70', aliases: ['NGC 6681'], kind: 'kuresel-kume', constellation: 'Yay', ra: 18.72, dec: -32.292, mag: 7.9, size: '8' },
  { code: 'M 71', aliases: ['NGC 6838'], kind: 'kuresel-kume', constellation: 'Ok', ra: 19.896, dec: 18.779, mag: 8.2, size: '7' },
  { code: 'M 72', aliases: ['NGC 6981'], kind: 'kuresel-kume', constellation: 'Kova', ra: 20.891, dec: -12.537, mag: 9.3, size: '6' },
  { code: 'M 73', aliases: ['NGC 6994'], kind: 'asterizm', constellation: 'Kova', ra: 20.983, dec: -12.633, mag: 8.9, size: '2.8' },
  { code: 'M 74', aliases: ['NGC 628'], kind: 'galaksi', constellation: 'Balıklar', ra: 1.611, dec: 15.783, mag: 9.4, size: '10x9', name: 'Hayalet Galaksi', note: 'Düşük yüzey parlaklığı nedeniyle Messier listesinin en zor hedeflerinden sayılır.' },
  { code: 'M 75', aliases: ['NGC 6864'], kind: 'kuresel-kume', constellation: 'Yay', ra: 20.101, dec: -21.922, mag: 8.5, size: '6' },
  { code: 'M 76', aliases: ['NGC 650'], kind: 'gezegenimsi-bulutsu', constellation: 'Perseus', ra: 1.705, dec: 51.575, mag: 10.1, size: '2.7x1.8', name: 'Küçük Dambıl' },
  { code: 'M 77', aliases: ['NGC 1068'], kind: 'galaksi', constellation: 'Balina', ra: 2.711, dec: -0.013, mag: 8.9, size: '7x6' },
  { code: 'M 78', aliases: ['NGC 2068'], kind: 'yansima-bulutsusu', constellation: 'Avcı', ra: 5.779, dec: 0.079, mag: 8.3, size: '8x6' },
  { code: 'M 79', aliases: ['NGC 1904'], kind: 'kuresel-kume', constellation: 'Tavşan', ra: 5.402, dec: -24.524, mag: 7.7, size: '9' },
  { code: 'M 80', aliases: ['NGC 6093'], kind: 'kuresel-kume', constellation: 'Akrep', ra: 16.284, dec: -22.976, mag: 7.3, size: '10' },
  { code: 'M 81', aliases: ['NGC 3031'], kind: 'galaksi', constellation: 'Büyük Ayı', ra: 9.926, dec: 69.065, mag: 6.9, size: '27x14', name: 'Bode Galaksisi' },
  { code: 'M 82', aliases: ['NGC 3034'], kind: 'galaksi', constellation: 'Büyük Ayı', ra: 9.931, dec: 69.681, mag: 8.4, size: '11x4', name: 'Puro Galaksisi', note: 'Merkezden fışkıran Ha akıntısı dar bant katkısıyla belirgin şekilde ortaya çıkar.' },
  { code: 'M 83', aliases: ['NGC 5236'], kind: 'galaksi', constellation: 'Hidra', ra: 13.617, dec: -29.866, mag: 7.5, size: '13x12', name: 'Güney Fırıldak Galaksisi' },
  { code: 'M 84', aliases: ['NGC 4374'], kind: 'galaksi', constellation: 'Başak', ra: 12.418, dec: 12.887, mag: 9.1, size: '6x5' },
  { code: 'M 85', aliases: ['NGC 4382'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.42, dec: 18.191, mag: 9.1, size: '7x5.5' },
  { code: 'M 86', aliases: ['NGC 4406'], kind: 'galaksi', constellation: 'Başak', ra: 12.436, dec: 12.946, mag: 8.9, size: '9x6' },
  { code: 'M 87', aliases: ['NGC 4486'], kind: 'galaksi', constellation: 'Başak', ra: 12.514, dec: 12.391, mag: 8.6, size: '8x7', name: 'Başak A', note: 'İlk kez görüntülenen kara delik bu galaksinin merkezindedir; jeti uzun odakta yakalanabilir.' },
  { code: 'M 88', aliases: ['NGC 4501'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.533, dec: 14.42, mag: 9.6, size: '7x4' },
  { code: 'M 89', aliases: ['NGC 4552'], kind: 'galaksi', constellation: 'Başak', ra: 12.594, dec: 12.556, mag: 9.8, size: '5x5' },
  { code: 'M 90', aliases: ['NGC 4569'], kind: 'galaksi', constellation: 'Başak', ra: 12.613, dec: 13.163, mag: 9.5, size: '10x4' },
  { code: 'M 91', aliases: ['NGC 4548'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.589, dec: 14.496, mag: 10.2, size: '5x4' },
  { code: 'M 92', aliases: ['NGC 6341'], kind: 'kuresel-kume', constellation: 'Herkül', ra: 17.285, dec: 43.136, mag: 6.4, size: '14' },
  { code: 'M 93', aliases: ['NGC 2447'], kind: 'acik-kume', constellation: 'Pupa', ra: 7.744, dec: -23.857, mag: 6.2, size: '22' },
  { code: 'M 94', aliases: ['NGC 4736'], kind: 'galaksi', constellation: 'Av Köpekleri', ra: 12.848, dec: 41.12, mag: 8.2, size: '11x9', name: 'Timsah Gözü Galaksisi' },
  { code: 'M 95', aliases: ['NGC 3351'], kind: 'galaksi', constellation: 'Aslan', ra: 10.733, dec: 11.704, mag: 9.7, size: '7x5' },
  { code: 'M 96', aliases: ['NGC 3368'], kind: 'galaksi', constellation: 'Aslan', ra: 10.78, dec: 11.82, mag: 9.2, size: '8x5' },
  { code: 'M 97', aliases: ['NGC 3587'], kind: 'gezegenimsi-bulutsu', constellation: 'Büyük Ayı', ra: 11.247, dec: 55.019, mag: 9.9, size: '3.4', name: 'Baykuş Bulutsusu' },
  { code: 'M 98', aliases: ['NGC 4192'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.228, dec: 14.9, mag: 10.1, size: '10x3' },
  { code: 'M 99', aliases: ['NGC 4254'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.313, dec: 14.417, mag: 9.9, size: '5x5' },
  { code: 'M 100', aliases: ['NGC 4321'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.382, dec: 15.822, mag: 9.3, size: '7x6' },
  { code: 'M 101', aliases: ['NGC 5457'], kind: 'galaksi', constellation: 'Büyük Ayı', ra: 14.053, dec: 54.349, mag: 7.9, size: '29x27', name: 'Fırıldak Galaksisi' },
  { code: 'M 102', aliases: ['NGC 5866'], kind: 'galaksi', constellation: 'Ejder', ra: 15.108, dec: 55.763, mag: 9.9, size: '5x2', name: 'Mekik Galaksisi' },
  { code: 'M 103', aliases: ['NGC 581'], kind: 'acik-kume', constellation: 'Kraliçe', ra: 1.556, dec: 60.658, mag: 7.4, size: '6' },
  { code: 'M 104', aliases: ['NGC 4594'], kind: 'galaksi', constellation: 'Başak', ra: 12.667, dec: -11.623, mag: 8.0, size: '9x4', name: 'Sombrero Galaksisi' },
  { code: 'M 105', aliases: ['NGC 3379'], kind: 'galaksi', constellation: 'Aslan', ra: 10.797, dec: 12.582, mag: 9.3, size: '5x5' },
  { code: 'M 106', aliases: ['NGC 4258'], kind: 'galaksi', constellation: 'Av Köpekleri', ra: 12.316, dec: 47.304, mag: 8.4, size: '19x7' },
  { code: 'M 107', aliases: ['NGC 6171'], kind: 'kuresel-kume', constellation: 'Yılancı', ra: 16.542, dec: -13.054, mag: 8.1, size: '13' },
  { code: 'M 108', aliases: ['NGC 3556'], kind: 'galaksi', constellation: 'Büyük Ayı', ra: 11.192, dec: 55.674, mag: 10.0, size: '8x2' },
  { code: 'M 109', aliases: ['NGC 3992'], kind: 'galaksi', constellation: 'Büyük Ayı', ra: 11.96, dec: 53.375, mag: 9.8, size: '8x5' },
  { code: 'M 110', aliases: ['NGC 205'], kind: 'galaksi', constellation: 'Andromeda', ra: 0.673, dec: 41.685, mag: 8.1, size: '22x11' },
];

/* ─────────────────  MESSIER DIŞI POPÜLER ASTROFOTO HEDEFLERİ  ───────────── */

export const deepSky: CatalogRow[] = [
  { code: 'NGC 7000', aliases: ['Caldwell 20'], kind: 'emisyon-bulutsusu', constellation: 'Kuğu', ra: 20.988, dec: 44.53, mag: 4.0, size: '120x100', name: 'Kuzey Amerika Bulutsusu', slug: 'ngc7000-kuzey-amerika', note: 'Şehir içinden bile dual-band filtreyle çalışılabilen geniş alan klasiği.' },
  { code: 'IC 5070', kind: 'emisyon-bulutsusu', constellation: 'Kuğu', ra: 20.79, dec: 44.36, mag: 8.0, size: '60x50', name: 'Pelikan Bulutsusu' },
  { code: 'IC 1396', kind: 'emisyon-bulutsusu', constellation: 'Kral', ra: 21.651, dec: 57.5, mag: 3.5, size: '170x140', name: 'Fil Hortumu Bulutsusu', slug: 'ic1396-fil-hortumu', note: 'İçindeki hortum biçimli globül uzun odaklarda ayrı bir hedef olarak çalışılır.' },
  { code: 'NGC 6960', aliases: ['Caldwell 34'], kind: 'sungerimsi-kalinti', constellation: 'Kuğu', ra: 20.76, dec: 30.72, mag: 7.0, size: '70x6', name: 'Batı Peçe Bulutsusu' },
  { code: 'NGC 6992', aliases: ['Caldwell 33'], kind: 'sungerimsi-kalinti', constellation: 'Kuğu', ra: 20.933, dec: 31.72, mag: 7.0, size: '60x8', name: 'Doğu Peçe Bulutsusu' },
  { code: 'IC 1805', kind: 'emisyon-bulutsusu', constellation: 'Kraliçe', ra: 2.548, dec: 61.45, mag: 6.5, size: '150x150', name: 'Kalp Bulutsusu' },
  { code: 'IC 1848', kind: 'emisyon-bulutsusu', constellation: 'Kraliçe', ra: 2.85, dec: 60.42, mag: 6.5, size: '100x60', name: 'Ruh Bulutsusu' },
  { code: 'NGC 281', kind: 'emisyon-bulutsusu', constellation: 'Kraliçe', ra: 0.884, dec: 56.62, mag: 7.4, size: '35x30', name: 'Pacman Bulutsusu' },
  { code: 'NGC 7635', aliases: ['Caldwell 11'], kind: 'emisyon-bulutsusu', constellation: 'Kraliçe', ra: 23.34, dec: 61.2, mag: 10.0, size: '15x8', name: 'Kabarcık Bulutsusu' },
  { code: 'NGC 7380', kind: 'emisyon-bulutsusu', constellation: 'Kral', ra: 22.79, dec: 58.13, mag: 7.2, size: '25', name: 'Büyücü Bulutsusu' },
  { code: 'Sh2-155', aliases: ['Caldwell 9'], kind: 'emisyon-bulutsusu', constellation: 'Kral', ra: 22.95, dec: 62.63, mag: 7.7, size: '50x30', name: 'Mağara Bulutsusu' },
  { code: 'NGC 2237', aliases: ['Caldwell 49'], kind: 'emisyon-bulutsusu', constellation: 'Tek Boynuzlu At', ra: 6.529, dec: 4.983, mag: 9.0, size: '80x60', name: 'Rozet Bulutsusu', slug: 'ngc2237-rozet', note: 'Merkezinde NGC 2244 açık kümesini barındırır; SHO paletinin en sevilen hedeflerinden.' },
  { code: 'IC 434', aliases: ['Barnard 33'], kind: 'karanlik-bulutsu', constellation: 'Avcı', ra: 5.683, dec: -2.45, mag: 6.8, size: '8x6', name: 'At Başı Bulutsusu', slug: 'ic434-at-basi', note: 'Parlak IC 434 emisyon perdesinin önündeki ikonik karanlık bulutsu; Ha kontrastı belirleyicidir.' },
  { code: 'NGC 2024', kind: 'emisyon-bulutsusu', constellation: 'Avcı', ra: 5.687, dec: -1.85, mag: 2.0, size: '30', name: 'Alev Bulutsusu', note: 'Alnitak yıldızının parlaklığı kadrajda hâle yapar; yıldızı çerçeve dışına almak yaygın çözümdür.' },
  { code: 'IC 405', aliases: ['Caldwell 31'], kind: 'emisyon-bulutsusu', constellation: 'Arabacı', ra: 5.269, dec: 34.27, mag: 6.0, size: '37x19', name: 'Alevli Yıldız Bulutsusu' },
  { code: 'IC 410', kind: 'emisyon-bulutsusu', constellation: 'Arabacı', ra: 5.372, dec: 33.47, mag: 7.5, size: '40x30', name: 'İribaşlar Bulutsusu' },
  { code: 'IC 443', kind: 'sungerimsi-kalinti', constellation: 'İkizler', ra: 6.29, dec: 22.5, mag: 12.0, size: '50x40', name: 'Denizanası Bulutsusu' },
  { code: 'NGC 1499', kind: 'emisyon-bulutsusu', constellation: 'Perseus', ra: 4.03, dec: 36.42, mag: 6.0, size: '160x40', name: 'Kaliforniya Bulutsusu' },
  { code: 'NGC 869', aliases: ['NGC 884', 'Caldwell 14'], kind: 'acik-kume', constellation: 'Perseus', ra: 2.32, dec: 57.13, mag: 4.3, size: '60', name: 'Çifte Küme' },
  { code: 'NGC 253', aliases: ['Caldwell 65'], kind: 'galaksi', constellation: 'Heykeltıraş', ra: 0.793, dec: -25.288, mag: 7.1, size: '27x7', name: 'Heykeltıraş Galaksisi' },
  { code: 'NGC 891', aliases: ['Caldwell 23'], kind: 'galaksi', constellation: 'Andromeda', ra: 2.376, dec: 42.349, mag: 9.9, size: '14x2.5', name: 'Gümüş Kesit Galaksisi' },
  { code: 'NGC 4565', aliases: ['Caldwell 38'], kind: 'galaksi', constellation: 'Berenis Saçı', ra: 12.606, dec: 25.988, mag: 9.6, size: '16x2', name: 'İğne Galaksisi' },
  { code: 'NGC 4631', aliases: ['Caldwell 32'], kind: 'galaksi', constellation: 'Av Köpekleri', ra: 12.703, dec: 32.542, mag: 9.2, size: '15x3', name: 'Balina Galaksisi' },
  { code: 'NGC 3628', kind: 'galaksi', constellation: 'Aslan', ra: 11.343, dec: 13.59, mag: 10.2, size: '15x3', name: 'Hamburger Galaksisi', note: 'M 65 ve M 66 ile birlikte "Aslan Üçlüsü" kadrajını oluşturur.' },
  { code: 'NGC 7331', aliases: ['Caldwell 30'], kind: 'galaksi', constellation: 'Pegasus', ra: 22.617, dec: 34.416, mag: 9.5, size: '10x4' },
  { code: 'NGC 7317', aliases: ['HCG 92'], kind: 'galaksi-grubu', constellation: 'Pegasus', ra: 22.6, dec: 33.966, mag: 13.0, size: '3', name: 'Stephan Beşlisi' },
  { code: 'NGC 5128', aliases: ['Caldwell 77'], kind: 'galaksi', constellation: 'Erboğa', ra: 13.424, dec: -43.019, mag: 6.8, size: '26x20', name: 'Centaurus A', note: "Türkiye'den çok alçak kalır; ufka yakın çekimde atmosferik dağılım düzeltici gerekir." },
  { code: 'NGC 2264', aliases: ['Caldwell 41'], kind: 'emisyon-bulutsusu', constellation: 'Tek Boynuzlu At', ra: 6.687, dec: 9.895, mag: 3.9, size: '20', name: 'Koni ve Noel Ağacı Kümesi' },
  { code: 'NGC 6888', aliases: ['Caldwell 27'], kind: 'emisyon-bulutsusu', constellation: 'Kuğu', ra: 20.201, dec: 38.355, mag: 7.4, size: '18x12', name: 'Hilal Bulutsusu' },
  { code: 'NGC 7293', aliases: ['Caldwell 63'], kind: 'gezegenimsi-bulutsu', constellation: 'Kova', ra: 22.494, dec: -20.837, mag: 7.6, size: '16', name: 'Sarmal Bulutsusu' },
  { code: 'NGC 6302', aliases: ['Caldwell 69'], kind: 'gezegenimsi-bulutsu', constellation: 'Akrep', ra: 17.229, dec: -37.1, mag: 7.1, size: '3', name: 'Kelebek Bulutsusu', slug: 'ngc6302-kelebek', note: "Türkiye'den güney ufkuna yakın kalır; kısa gözlem penceresi ve temiz güney ufku ister." },
  { code: 'NGC 6543', aliases: ['Caldwell 6'], kind: 'gezegenimsi-bulutsu', constellation: 'Ejder', ra: 17.98, dec: 66.633, mag: 8.1, size: '0.3', name: 'Kedi Gözü Bulutsusu' },
  { code: 'NGC 2359', kind: 'emisyon-bulutsusu', constellation: 'Büyük Köpek', ra: 7.311, dec: -13.2, mag: 11.0, size: '8', name: "Thor'un Miğferi" },
  { code: 'NGC 7023', aliases: ['Caldwell 4'], kind: 'yansima-bulutsusu', constellation: 'Kral', ra: 21.017, dec: 68.167, mag: 6.8, size: '18', name: 'İris Bulutsusu' },
  { code: 'NGC 1333', kind: 'yansima-bulutsusu', constellation: 'Perseus', ra: 3.487, dec: 31.35, mag: 9.5, size: '9x7' },
  { code: 'IC 2118', kind: 'yansima-bulutsusu', constellation: 'Irmak', ra: 5.055, dec: -7.23, mag: 13.0, size: '180x60', name: 'Cadı Başı Bulutsusu' },
  { code: 'NGC 1977', kind: 'yansima-bulutsusu', constellation: 'Avcı', ra: 5.588, dec: -4.85, mag: 7.0, size: '20', name: 'Koşan Adam Bulutsusu' },
  { code: 'IC 63', kind: 'yansima-bulutsusu', constellation: 'Kraliçe', ra: 0.977, dec: 60.72, mag: 10.0, size: '10x3', name: "Kraliçe'nin Hayaleti" },
  { code: 'Sh2-101', kind: 'emisyon-bulutsusu', constellation: 'Kuğu', ra: 20.0, dec: 35.3, mag: 9.0, size: '16x9', name: 'Lale Bulutsusu' },
  { code: 'Sh2-129', kind: 'emisyon-bulutsusu', constellation: 'Kral', ra: 21.19, dec: 59.95, size: '90', name: 'Uçan Yarasa Bulutsusu', note: 'İçindeki OU4 "Mürekkep Balığı" yalnızca çok uzun OIII toplamlarında belirir.' },
  { code: 'Sh2-132', kind: 'emisyon-bulutsusu', constellation: 'Kral', ra: 22.32, dec: 56.1, size: '45', name: 'Aslan Bulutsusu' },
  { code: 'Sh2-240', aliases: ['Simeis 147'], kind: 'sungerimsi-kalinti', constellation: 'Boğa', ra: 5.71, dec: 28.0, size: '180', name: 'Spagetti Bulutsusu', note: 'Gökyüzünün en sönük geniş kalıntılarından; onlarca saat toplam süre ister.' },
  { code: 'Barnard 150', aliases: ['LDN 1082'], kind: 'karanlik-bulutsu', constellation: 'Kral', ra: 20.85, dec: 67.4, size: '60', name: 'Denizatı Bulutsusu' },
  { code: 'Abell 21', kind: 'gezegenimsi-bulutsu', constellation: 'İkizler', ra: 7.487, dec: 13.25, mag: 10.9, size: '10', name: 'Medusa Bulutsusu' },
  { code: 'NGC 6334', aliases: ['Caldwell 6334'], kind: 'emisyon-bulutsusu', constellation: 'Akrep', ra: 17.33, dec: -36.1, size: '40', name: 'Kedi Pençesi Bulutsusu' },
  { code: 'NGC 7789', aliases: ['Caldwell 43'], kind: 'acik-kume', constellation: 'Kraliçe', ra: 23.958, dec: 56.71, mag: 6.7, size: '16', name: 'Caroline Gülü' },
  { code: 'NGC 457', aliases: ['Caldwell 13'], kind: 'acik-kume', constellation: 'Kraliçe', ra: 1.322, dec: 58.29, mag: 6.4, size: '13', name: 'Baykuş Kümesi' },
  { code: 'NGC 3372', aliases: ['Caldwell 92'], kind: 'emisyon-bulutsusu', constellation: 'Karina', ra: 10.752, dec: -59.867, mag: 1.0, size: '120', name: 'Karina Bulutsusu', note: "Türkiye'den ufkun altında kalır; ancak güney yarımküre seyahatlerinde çekilebilir." },
  { code: 'NGC 2170', kind: 'yansima-bulutsusu', constellation: 'Tek Boynuzlu At', ra: 6.122, dec: -6.4, size: '30', name: 'Melek Bulutsusu' },
  { code: 'IC 2177', kind: 'emisyon-bulutsusu', constellation: 'Tek Boynuzlu At', ra: 7.077, dec: -10.7, size: '120x40', name: 'Martı Bulutsusu' },
  { code: 'NGC 6820', kind: 'emisyon-bulutsusu', constellation: 'Küçük Tilki', ra: 19.717, dec: 23.3, mag: 7.1, size: '40' },
  { code: 'Barnard 33', kind: 'karanlik-bulutsu', constellation: 'Avcı', ra: 5.683, dec: -2.46, size: '8x6', name: 'At Başı Globülü', slug: 'b33-at-basi-globul' },
  { code: 'LBN 552', aliases: ['vdB 141'], kind: 'yansima-bulutsusu', constellation: 'Kral', ra: 21.269, dec: 68.27, size: '20', name: 'Hayalet Bulutsusu' },
];

/* ──────────────────────  GÜNEŞ SİSTEMİ VE MANZARA  ───────────────────── */

/**
 * Bu kayıtların sabit RA/DEC'i yoktur; alan `0` bırakılmaz, çünkü sıfır
 * gerçek bir koordinattır (Koç noktası) ve efemeris hesabı bu hedefleri
 * yanlışlıkla gökyüzünde bir yere koyardı. Bunun yerine tür `MOVING_KINDS`
 * içinde ve `ra`/`dec` alanları `undefined`.
 */
export interface MovingRow {
  code: string;
  kind: TargetKind;
  name: string;
  aliases?: string[];
  slug?: string;
  note?: string;
  /** Ne zaman çekilir — sabit bir "en uygun ay" hesabı yapılamadığı için elle. */
  window: string;
  /** Kadraja göre önerilen odak aralığı. */
  focal: string;
  size?: string;
}

export const movingTargets: MovingRow[] = [
  { code: 'Ay', kind: 'ay', name: 'Ay', window: 'Her ay; detay için ilk/son dördün terminatörü', focal: '600–2500 mm', size: '31', note: 'Dolunayda gölge olmadığı için krater kabartması kaybolur; terminatör hattı tercih edilir.' },
  { code: 'Güneş', kind: 'gunes', name: 'Güneş', window: 'Yıl boyu — güneş filtresi olmadan ASLA', focal: '400–1500 mm', size: '32', note: 'Filtresiz bakış saniyeler içinde kalıcı körlük yapar. Ha teleskobu protuberans, beyaz ışık leke gösterir.' },
  { code: 'Merkür', kind: 'gezegen', name: 'Merkür', window: 'Yılda birkaç kez, şafak ya da alacakaranlıkta', focal: '2000 mm ve üzeri', size: '0.2', note: 'Ufka yakın kaldığı için atmosferik dağılım düzeltici (ADC) neredeyse zorunludur.' },
  { code: 'Venüs', kind: 'gezegen', name: 'Venüs', window: 'Akşam ya da sabah göründüğü dönemler', focal: '2000 mm ve üzeri', size: '1', note: 'UV filtresi bulut yapısını ortaya çıkarır; görünür ışıkta düz beyaz bir disk kalır.' },
  { code: 'Mars', kind: 'gezegen', name: 'Mars', window: 'Karşı konum çevresinde ~2 yılda bir', focal: '2500 mm ve üzeri', size: '0.4' },
  { code: 'Jüpiter', kind: 'gezegen', name: 'Jüpiter', window: 'Karşı konum çevresinde her yıl', focal: '2000 mm ve üzeri', size: '0.8', note: 'Hızlı döndüğü için tek video 3 dakikayı aşmamalı; aşarsa detay bulanır (derotasyon gerekir).' },
  { code: 'Satürn', kind: 'gezegen', name: 'Satürn', window: 'Karşı konum çevresinde her yıl', focal: '2500 mm ve üzeri', size: '0.7' },
  { code: 'Uranüs', kind: 'gezegen', name: 'Uranüs', window: 'Sonbahar–kış karşı konumu', focal: '2500 mm ve üzeri', size: '0.06' },
  { code: 'Neptün', kind: 'gezegen', name: 'Neptün', window: 'Sonbahar karşı konumu', focal: '2500 mm ve üzeri', size: '0.04' },
  { code: 'Kuyruklu yıldız', kind: 'kuyruklu-yildiz', name: 'Kuyruklu Yıldız', window: 'Görünür bir kuyruklu yıldız olduğunda', focal: '50–600 mm', note: 'Çekirdek yıldızlara göre hareket eder; yıldıza ve çekirdeğe ayrı hizalanan iki yığın birleştirilir.' },
  { code: 'Perseidler', kind: 'meteor-yagmuru', name: 'Perseid Meteor Yağmuru', window: 'Ağustos ortası', focal: '14–24 mm' },
  { code: 'Geminidler', kind: 'meteor-yagmuru', name: 'Geminid Meteor Yağmuru', window: 'Aralık ortası', focal: '14–24 mm' },
  { code: 'Kadranlılar', kind: 'meteor-yagmuru', name: 'Kadranlı Meteor Yağmuru', window: 'Ocak başı', focal: '14–24 mm' },
  { code: 'Samanyolu', kind: 'genis-alan', name: 'Samanyolu Merkezi', window: 'Mayıs – Eylül, Ay yokken', focal: '14–35 mm', note: 'Merkez bölge Türkiye enlemlerinde ufkun 25° üzerine çıkar; güney ufku açık saha gerekir.' },
  { code: 'Gece manzarası', kind: 'genis-alan', name: 'Gece Manzarası (Nightscape)', window: 'Yıl boyu', focal: '14–35 mm' },
  { code: 'Ay tutulması', kind: 'gokyuzu-olayi', name: 'Ay Tutulması', window: 'Takvime bağlı', focal: '400–1200 mm' },
  { code: 'Güneş tutulması', kind: 'gokyuzu-olayi', name: 'Güneş Tutulması', window: 'Takvime bağlı', focal: '400–1200 mm', note: 'Bütünlük dışındaki her anda güneş filtresi zorunludur.' },
  { code: 'ISS geçişi', kind: 'gokyuzu-olayi', name: 'ISS Geçişi / Transit', window: 'Tahmin servislerine göre', focal: '1000 mm ve üzeri' },
  { code: 'Kutup ışıkları', kind: 'gokyuzu-olayi', name: 'Kutup Işıkları', window: 'Güneş fırtınalarında', focal: '14–35 mm' },
];
