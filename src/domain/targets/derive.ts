/**
 * HEDEF KATALOĞU — ÖLÇÜLEN VERİDEN TÜRETİLEN ALANLAR.
 *
 * Katalog artık 200'ün üzerinde kayıt taşıyor. "En uygun aylar", "önerilen
 * odak", "zorluk" gibi alanları her kayıt için elle yazmak iki soruna yol
 * açardı: yüzlerce satırda tutarsızlık ve doğrulanamazlık. Bunun yerine
 * kaynak veri (RA, DEC, kadir, açısal boyut, tür) elle giriliyor, geri kalan
 * her alan buradan **hesaplanıyor**.
 *
 * Böylece "M 81 için önerilen odak neden 300–700 mm?" sorusunun cevabı bir
 * editörün tercihi değil, ölçülebilir bir kural oluyor. Editoryal bir kayıt
 * kuralı beğenmezse `data.ts` içindeki üst yazım katmanıyla değeri
 * değiştirebilir — ama kuralın kendisi tek yerde duruyor.
 */

export type TargetKind =
  | 'galaksi'
  | 'galaksi-grubu'
  | 'emisyon-bulutsusu'
  | 'yansima-bulutsusu'
  | 'gezegenimsi-bulutsu'
  | 'karanlik-bulutsu'
  | 'sungerimsi-kalinti'
  | 'kuresel-kume'
  | 'acik-kume'
  | 'yildiz-bulutu'
  | 'cift-yildiz'
  | 'asterizm'
  /*
   * Aşağıdaki üçü elle girilmiş katalogda yoktu; birincil kataloglar
   * içeri alındığında ortaya çıktılar (bkz. supabase/functions/
   * katalog-yukle). "Neb" tipi bir bulutsudur ama emisyon mu yansıma mı
   * olduğu kaynakta yazmıyor; "*" NGC numarası almış tekil bir yıldız;
   * "Other" ise OpenNGC'nin kendi sınıflandıramadığı kayıtlar.
   *
   * Tahmin etmiyoruz. "Neb"i emisyon bulutsusu saymak 94 kayda yanlış
   * filtre önerisi (SHO) verirdi ve kullanıcı geniş bant çekilmesi
   * gereken bir hedefe dar bant filtre alırdı.
   */
  | 'bulutsu'
  | 'yildiz'
  | 'diger'
  | 'gezegen'
  | 'ay'
  | 'gunes'
  | 'kuyruklu-yildiz'
  | 'meteor-yagmuru'
  | 'genis-alan'
  | 'gokyuzu-olayi';

export const targetKindLabels: Record<TargetKind, string> = {
  galaksi: 'Galaksi',
  'galaksi-grubu': 'Galaksi Grubu',
  'emisyon-bulutsusu': 'Emisyon Bulutsusu',
  'yansima-bulutsusu': 'Yansıma Bulutsusu',
  'gezegenimsi-bulutsu': 'Gezegenimsi Bulutsu',
  'karanlik-bulutsu': 'Karanlık Bulutsu',
  'sungerimsi-kalinti': 'Süpernova Kalıntısı',
  'kuresel-kume': 'Küresel Küme',
  'acik-kume': 'Açık Küme',
  'yildiz-bulutu': 'Yıldız Bulutu',
  'cift-yildiz': 'Çift Yıldız',
  asterizm: 'Asterizm',
  bulutsu: 'Bulutsu',
  yildiz: 'Yıldız',
  diger: 'Diğer',
  gezegen: 'Gezegen',
  ay: 'Ay',
  gunes: 'Güneş',
  'kuyruklu-yildiz': 'Kuyruklu Yıldız',
  'meteor-yagmuru': 'Meteor Yağmuru',
  'genis-alan': 'Geniş Alan / Manzara',
  'gokyuzu-olayi': 'Gökyüzü Olayı',
};

/**
 * Fotoğraf türü eşlemesi — yükleme sihirbazı hedefe göre türü öneriyor.
 *
 * Kullanıcı "M 42" seçtiğinde türü ayrıca "Deep Sky" yapmak zorunda
 * kalmamalı; hedefin türü zaten bunu söylüyor. Öneri **zorlama değil**:
 * aynı hedefin geniş alan manzarası da çekilebilir, kullanıcı türü
 * değiştirebilir.
 */
export const kindToPhotoType: Record<TargetKind, string> = {
  galaksi: 'deep-sky',
  'galaksi-grubu': 'deep-sky',
  'emisyon-bulutsusu': 'deep-sky',
  'yansima-bulutsusu': 'deep-sky',
  'gezegenimsi-bulutsu': 'deep-sky',
  'karanlik-bulutsu': 'deep-sky',
  'sungerimsi-kalinti': 'deep-sky',
  'kuresel-kume': 'deep-sky',
  'acik-kume': 'deep-sky',
  'yildiz-bulutu': 'deep-sky',
  'cift-yildiz': 'deep-sky',
  asterizm: 'deep-sky',
  bulutsu: 'deep-sky',
  yildiz: 'deep-sky',
  diger: 'deep-sky',
  gezegen: 'gezegen',
  ay: 'ay',
  gunes: 'gunes',
  'kuyruklu-yildiz': 'gezegen',
  'meteor-yagmuru': 'genis-alan',
  'genis-alan': 'genis-alan',
  'gokyuzu-olayi': 'genis-alan',
};

/** Güneş sistemi ve manzara hedefleri sabit RA/DEC taşımaz. */
export const MOVING_KINDS: TargetKind[] = [
  'gezegen',
  'ay',
  'gunes',
  'kuyruklu-yildiz',
  'meteor-yagmuru',
  'genis-alan',
  'gokyuzu-olayi',
];

export function isMovingKind(kind: TargetKind): boolean {
  return MOVING_KINDS.includes(kind);
}

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

/** Ayın 1'ine karşılık gelen yaklaşık yıl günü (artık yıl yok sayılır). */
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

function monthOfDay(dayOfYear: number): number {
  const day = ((dayOfYear % 365) + 365) % 365;
  for (let i = 11; i >= 0; i -= 1) if (day >= MONTH_START[i]) return i;
  return 0;
}

/**
 * Hedefin gece yarısı meridyenden geçtiği günü verir.
 *
 * Bir cisim, Güneş'in sağ açıklığı kendi RA'sının 12 saat gerisindeyken gece
 * yarısı en yüksek noktasına ulaşır. Güneş'in RA'sı ilkbahar ekinoksunda
 * (≈ 21 Mart, yılın 80. günü) sıfırdır ve yılda bir tam tur atar. İkisini
 * birleştirmek, "en uygun ay"ı tahmin değil hesap hâline getiriyor.
 */
export function midnightCulminationDay(raHours: number): number {
  const sunRa = ((raHours - 12) % 24 + 24) % 24;
  return (sunRa / 24) * 365 + 80;
}

/**
 * RA'dan gözlem penceresi: zirvenin ±45 günü.
 *
 * Pencere neden 3 ay? Cisim gece yarısı zirve yapmadan önce ve sonra da
 * gecenin bir bölümünde erişilebilir kalır; ±45 gün, "gecenin karanlık
 * yarısında ufkun üzerinde" kabaca doğru aralığı verir. Daha geniş bir
 * pencere her hedefi "her zaman uygun" göstererek bilgiyi işe yaramaz
 * hâle getirirdi.
 */
export function bestMonthsFromRa(raHours: number): string {
  const center = midnightCulminationDay(raHours);
  const start = monthOfDay(center - 45);
  const end = monthOfDay(center + 45);
  return start === end ? MONTHS[start] : `${MONTHS[start]} – ${MONTHS[end]}`;
}

/** "12.345" saat → "12ʰ 20ᵐ 42ˢ". */
export function formatRa(raHours: number): string {
  const total = Math.round(raHours * 3600);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}ʰ ${String(m).padStart(2, '0')}ᵐ ${String(s).padStart(2, '0')}ˢ`;
}

/** "+41.269" derece → "+41° 16′". */
export function formatDec(decDegrees: number): string {
  const sign = decDegrees < 0 ? '-' : '+';
  const abs = Math.abs(decDegrees);
  const d = Math.floor(abs);
  const m = Math.round((abs - d) * 60);
  // 59.7′ yuvarlanınca 60 olur; taşmayı dereceye aktarmazsak "+41° 60′" yazar.
  const carry = m === 60 ? 1 : 0;
  return `${sign}${d + carry}° ${String(m - carry * 60).padStart(2, '0')}′`;
}

/**
 * "178x63" → "178′ × 63′"; "20" → "20′"; "5x5" → "5′".
 *
 * Eşit eksenler tek değere iniyor: dairesel bir cismi "5′ × 5′" diye
 * yazmak aynı bilgiyi iki kez söylemek. Kuralın burada olması şart —
 * tohum veri ile veritabanı satırı aynı metni üretmezse, aynı hedef iki
 * kaynakta farklı görünür (bunu bir gidiş-dönüş testi yakaladı).
 */
export function formatAngularSize(size: string): string {
  const parts = size.split(/[x×]/).map((p) => p.trim());
  const unique = parts.every((p) => p === parts[0]) ? [parts[0]] : parts;
  return unique.map((p) => `${p}′`).join(' × ');
}

/** Açısal boyutun uzun kenarı, yay dakikası. */
export function longestAxisArcmin(size: string): number {
  const nums = size.split(/[x×]/).map((p) => Number(p.trim()));
  const valid = nums.filter((n) => Number.isFinite(n));
  return valid.length > 0 ? Math.max(...valid) : 0;
}

export type Difficulty = 'Kolay' | 'Orta' | 'Zor';

/**
 * Zorluk = parlaklık + küçüklük cezası.
 *
 * Yalnız kadir yetmez: 7. kadir bir gezegenimsi bulutsu 3 yay dakikasıysa
 * uzun odak, iyi seeing ve yüksek örnekleme ister; aynı kadirdeki 30 yay
 * dakikalık bir küme ise başlangıç hedefidir. Kadiri olmayan kayıtlar
 * (çoğu karanlık bulutsu) en kötü durum kabul edilir — bilinmeyeni kolay
 * saymak, kullanıcıyı hazırlıksız bir geceye göndermek olurdu.
 */
export function difficultyFor(
  magnitude: number | undefined,
  sizeArcmin: number
): Difficulty {
  const mag = magnitude ?? 11;
  const penalty = sizeArcmin < 5 ? 4 : sizeArcmin < 10 ? 2 : sizeArcmin < 25 ? 1 : 0;
  const score = mag + penalty;
  if (score <= 7.5) return 'Kolay';
  if (score <= 10.5) return 'Orta';
  return 'Zor';
}

/**
 * Önerilen odak: hedef, APS-C benzeri bir kadrajın yarısını doldursun.
 *
 * Aralık veriyoruz çünkü "doldurmak" bir tercih: kimi bulutsuyu çevresiyle,
 * kimini yalnız çerçeveler. Tek bir sayı vermek bu tercihi kullanıcı adına
 * yapmak olurdu.
 */
export function recommendedFocalFor(sizeArcmin: number): string {
  if (sizeArcmin >= 120) return '35–135 mm';
  if (sizeArcmin >= 60) return '85–250 mm';
  if (sizeArcmin >= 30) return '135–400 mm';
  if (sizeArcmin >= 15) return '300–700 mm';
  if (sizeArcmin >= 8) return '500–1000 mm';
  if (sizeArcmin >= 3) return '900–1800 mm';
  return '1500 mm ve üzeri';
}

/** Türe göre filtre önerisi — dar bant her hedefte işe yaramaz. */
export function recommendedFiltersFor(kind: TargetKind): string {
  switch (kind) {
    case 'emisyon-bulutsusu':
      return 'SHO ya da Ha/OIII dual-band; şehir içinden de çalışılabilir';
    case 'gezegenimsi-bulutsu':
      return 'OIII ağırlıklı; Ha ile birlikte, yüksek örnekleme';
    case 'sungerimsi-kalinti':
      return 'Ha/OIII dual-band — OIII kanalı belirleyicidir';
    case 'karanlik-bulutsu':
      return 'Ha (arka perde emisyonsa) ya da geniş bant L-RGB';
    case 'yansima-bulutsusu':
      return 'Geniş bant (UV/IR-cut) — yansıyan ışık dar bantta kaybolur';
    case 'galaksi':
    case 'galaksi-grubu':
      return 'L-RGB; Ha eklentisi yalnızca HII bölgeleri için';
    case 'kuresel-kume':
    case 'acik-kume':
    case 'yildiz-bulutu':
    case 'cift-yildiz':
    case 'asterizm':
      return 'UV/IR-cut; renk için RGB — dar bant yıldızları söndürür';
    case 'bulutsu':
      /* Türü belirsiz bulutsu: emisyon olsaydı dar bant, yansıma
         olsaydı geniş bant derdik. Bilmediğimiz için ikisini birden
         önermiyoruz — kullanıcıyı yanlış filtreye yönlendirmektense
         kararı ona bırakmak dürüst olan. */
      return 'Türü kaynakta ayrıntılandırılmamış; geniş bantla başlayıp Ha denemesi yapın';
    case 'yildiz':
    case 'diger':
      return 'UV/IR-cut; renk için RGB';
    case 'gezegen':
      return 'RGB ya da IR-pass; yüksek kare hızlı video (lucky imaging)';
    case 'ay':
      return 'Filtre gerekmez; parlaklık için ND ya da kısa poz';
    case 'gunes':
      return 'ZORUNLU güneş filtresi: beyaz ışık (ND 5) ya da Ha teleskobu';
    case 'kuyruklu-yildiz':
      return 'Geniş bant; kuyruk için ayrı çekirdek/kuyruk hizalaması';
    case 'meteor-yagmuru':
    case 'genis-alan':
    case 'gokyuzu-olayi':
      return 'Filtresiz geniş açı; ışık kirliliği varsa yumuşak LP filtresi';
  }
}

/**
 * Türe göre kart arka planı.
 *
 * Kartlarda gerçek fotoğraf yoksa arka plan boş kalmasın diye türü anlatan
 * bir gradyan çiziliyor. Rastgele renk yerine türe bağlı olması, listede
 * gezinirken göz için ikinci bir sınıflandırma kanalı üretiyor: kırmızımsı
 * kartlar emisyon, mavimsi kartlar yansıma, altın kartlar küme.
 */
export function gradientFor(kind: TargetKind): string {
  switch (kind) {
    case 'emisyon-bulutsusu':
      return 'radial-gradient(120% 100% at 45% 55%, #e11d48 0%, #7f1d1d 40%, #2a0a16 78%, #050a12 100%)';
    case 'yansima-bulutsusu':
      return 'radial-gradient(110% 95% at 50% 50%, #60a5fa 0%, #1e3a8a 40%, #0f172a 78%, #050a12 100%)';
    case 'gezegenimsi-bulutsu':
      return 'radial-gradient(80% 80% at 50% 50%, #22d3ee 0%, #0e7490 35%, #164e63 65%, #050a12 100%)';
    case 'sungerimsi-kalinti':
      return 'radial-gradient(130% 90% at 40% 60%, #a78bfa 0%, #4c1d95 40%, #1e1035 75%, #050a12 100%)';
    case 'karanlik-bulutsu':
      return 'radial-gradient(120% 100% at 45% 55%, #c026d3 0%, #6b1a3a 38%, #2a0a1a 72%, #050a12 100%)';
    case 'galaksi':
    case 'galaksi-grubu':
      return 'radial-gradient(90% 70% at 55% 45%, #e8d3b8 0%, #7c5c46 32%, #241a2e 68%, #050a12 100%)';
    case 'kuresel-kume':
      return 'radial-gradient(70% 70% at 50% 50%, #fef3c7 0%, #d9c4a0 26%, #6b5a3e 56%, #0f0d08 100%)';
    case 'acik-kume':
    case 'yildiz-bulutu':
    case 'asterizm':
    case 'cift-yildiz':
      return 'radial-gradient(100% 90% at 50% 45%, #bfdbfe 0%, #6b7fae 30%, #26304a 65%, #050a12 100%)';
    case 'bulutsu':
      return 'radial-gradient(115% 95% at 48% 52%, #94a3b8 0%, #475569 38%, #1e293b 74%, #050a12 100%)';
    case 'yildiz':
    case 'diger':
      return 'radial-gradient(100% 90% at 50% 45%, #bfdbfe 0%, #6b7fae 30%, #26304a 65%, #050a12 100%)';
    case 'gezegen':
      return 'radial-gradient(75% 75% at 45% 45%, #fbbf24 0%, #b45309 38%, #3b1f08 72%, #050a12 100%)';
    case 'ay':
      return 'radial-gradient(75% 75% at 40% 40%, #f5f5f4 0%, #a8a29e 35%, #44403c 70%, #0c0a09 100%)';
    case 'gunes':
      return 'radial-gradient(80% 80% at 50% 50%, #fde047 0%, #f97316 35%, #7c2d12 70%, #1c0a02 100%)';
    case 'kuyruklu-yildiz':
      return 'radial-gradient(130% 80% at 30% 55%, #5eead4 0%, #0f766e 38%, #123240 72%, #050a12 100%)';
    case 'meteor-yagmuru':
    case 'gokyuzu-olayi':
      return 'linear-gradient(120deg, #0b1220 0%, #1e293b 40%, #475569 70%, #cbd5e1 100%)';
    case 'genis-alan':
      return 'linear-gradient(180deg, #050a12 0%, #14213d 45%, #3b2a4a 75%, #6b4a3a 100%)';
  }
}

/**
 * Hedef açıklaması — ölçülen değerlerden cümle.
 *
 * Metni 230 kayıt için elle yazmak yerine kuraldan üretiyoruz; aynı kural
 * hem tohum veride hem veritabanından okunan satırda çalışıyor. Böylece
 * `celestial_objects.description` boş bırakılabiliyor ve kayıt iki
 * kaynakta aynı görünüyor — metni satıra kopyalamak, kuralı değiştirdiğinde
 * eskimiş 230 kopya bırakırdı.
 *
 * Editör bir kaydın açıklamasını elle yazdıysa satırdaki değer kazanır;
 * kural yalnızca boşluğu dolduruyor.
 */
export function describeTarget(input: {
  kind: TargetKind;
  constellation: string;
  magnitude?: number;
  sizeArcmin: number;
  note?: string;
}): string {
  const kindText = targetKindLabels[input.kind].toLocaleLowerCase('tr-TR');
  const magText =
    input.magnitude !== undefined
      ? `${input.magnitude.toFixed(1)} kadir parlaklığında`
      : 'kataloglarda kadir değeri verilmeyen';
  const sizeText =
    input.sizeArcmin >= 60
      ? `${(input.sizeArcmin / 60).toFixed(1)}° genişliğinde geniş bir alan kaplar`
      : `${input.sizeArcmin} yay dakikası genişliğindedir`;

  const base = `${input.constellation} takımyıldızında, ${magText} bir ${kindText}. ${sizeText}.`;
  return input.note ? `${base} ${input.note}` : base;
}

/**
 * KATALOG KODU VE TÜR ZATEN EKRANDAYKEN GÖSTERİLECEK AD.
 *
 * `data.ts` adı olmayan kayıtlar için adı türetiyor:
 *
 *     name: row.name ?? `${row.code} ${KIND_NOUN[row.kind]}`
 *
 * Bu tek başına doğru — "M 29 Açık Kümesi" bir başlık olarak eksiksiz.
 * Ama kodu VE türü ayrı öğeler olarak gösteren bir liste satırında aynı
 * bilgi üç kez çıkıyor:
 *
 *     M 29  M 29 Açık Kümesi
 *     Açık Küme
 *
 * Bu fonksiyon o satırın ikinci parçasını veriyor: baştaki katalog kodu
 * atılıyor, geriye kalan yalnızca türün tekrarıysa `null` dönüyor.
 * `null` "ad yok" demek değil — "bu kaydın ekranda zaten görünmeyen
 * ÖZEL bir adı yok" demek. Çağıran taraf o zaman hiçbir şey basmıyor.
 *
 * Adı silmek çözüm olmazdı: başlıklarda ve sosyal önizlemede tam ad
 * gerekiyor. Karar, kodu ve türü zaten gösteren yerin tekrarı atması.
 */
export function properName(
  catalog: string,
  name: string,
  kind: TargetKind
): string | null {
  const lower = (value: string) => value.trim().toLocaleLowerCase('tr-TR');
  const trimmed = name.trim();

  const rest = lower(trimmed).startsWith(lower(catalog))
    ? trimmed.slice(catalog.length).trim()
    : trimmed;

  if (rest === '') return null;
  // "Açık Kümesi" ile "Açık Küme" aynı şeyi söylüyor — iyelik eki farkı.
  return lower(rest).startsWith(lower(targetKindLabels[kind])) ? null : rest;
}
