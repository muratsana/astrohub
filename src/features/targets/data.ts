import {
  bestMonthsFromRa,
  describeTarget,
  difficultyFor,
  formatAngularSize,
  formatDec,
  formatRa,
  gradientFor,
  isMovingKind,
  longestAxisArcmin,
  recommendedFiltersFor,
  recommendedFocalFor,
  targetKindLabels,
  type Difficulty,
  type TargetKind,
/*
 * Göreli yol, bilinçli: bu dosya `src/app/sitemap.ts` üzerinden
 * `vite.config.ts` tarafından da yükleniyor ve yapılandırma dosyası
 * Vite'ın `@/` takma adını henüz tanımıyor. Takma adla yazılırsa derleme
 * "Cannot find package '@/lib'" diyerek düşer.
 */
} from '../../domain/targets/derive';
import {
  deepSky,
  messier,
  movingTargets,
  type CatalogRow,
  type MovingRow,
} from './catalog';

export { targetKindLabels };
export type { TargetKind };

/**
 * ASTRONOMİK HEDEF KATALOĞU (§8.2).
 *
 * Katalog `catalog.ts` içindeki ölçülmüş satırlardan burada kuruluyor.
 * Elle yazılan tek şey kaynak veri; görüntülenen her metin ondan türüyor.
 * Bu ayrımın pratik faydası şu: yeni bir hedef eklemek dokuz satır metin
 * yazmayı değil, bir koordinat satırı girmeyi gerektiriyor — ve yüz kayıt
 * sonra "en uygun ay" alanı hâlâ tutarlı kalıyor.
 *
 * Güneş sistemi hedefleri (Ay, gezegenler, kuyruklu yıldız) ayrı bir
 * tablodan gelir: bunların sabit koordinatı yoktur ve sıfır yazmak, onları
 * gökyüzünde Koç noktasına çivilemek olurdu.
 */

export interface CelestialTarget {
  /**
   * Veritabanı kimliği — yalnızca katalog veritabanından geldiğinde dolu.
   * Tohum kayıtlarda yok; uydurmak, var olmayan bir satıra referans
   * üretmek olurdu.
   */
  id?: string;
  slug: string;
  name: string;
  /** Birincil katalog kodu. */
  catalog: string;
  aliases: string[];
  kind: TargetKind;
  constellation: string;
  /** "00sa 42dk 44sn" — boş dize, koordinatı olmayan hedeflerde. */
  ra: string;
  dec: string;
  magnitude?: number;
  angularSize: string;
  bestMonths: string;
  difficulty: Difficulty;
  recommendedFocal: string;
  recommendedFilters: string;
  description: string;
  gradient: string;
  /** Güneş sistemi / manzara hedefi mi? Efemeris hesapları bunları atlar. */
  moving: boolean;
}

/** "M 31" → "m31", "Sh2-155" → "sh2-155", "NGC 7000" → "ngc7000". */
export function codeSlug(code: string): string {
  return code
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Adı olmayan kayıtlar için ad üretimi.
 *
 * "M 49" ekranda yalnız başına bir kod; "M 49 Galaksisi" ise ne olduğunu
 * söylüyor. Tamlama ekleri Türkçede türe göre değiştiği için etiketleri
 * doğrudan kullanmak yerine küçük bir eşleme tutuyoruz — "M 9 Küresel Küme"
 * yerine "M 9 Küresel Kümesi".
 */
const KIND_NOUN: Record<TargetKind, string> = {
  galaksi: 'Galaksisi',
  'galaksi-grubu': 'Galaksi Grubu',
  'emisyon-bulutsusu': 'Emisyon Bulutsusu',
  'yansima-bulutsusu': 'Yansıma Bulutsusu',
  'gezegenimsi-bulutsu': 'Gezegenimsi Bulutsusu',
  'karanlik-bulutsu': 'Karanlık Bulutsusu',
  'sungerimsi-kalinti': 'Süpernova Kalıntısı',
  'kuresel-kume': 'Küresel Kümesi',
  'acik-kume': 'Açık Kümesi',
  'yildiz-bulutu': 'Yıldız Bulutu',
  'cift-yildiz': 'Çift Yıldızı',
  asterizm: 'Asterizmi',
  gezegen: 'Gezegeni',
  ay: 'Ay',
  gunes: 'Güneş',
  'kuyruklu-yildiz': 'Kuyruklu Yıldızı',
  'meteor-yagmuru': 'Meteor Yağmuru',
  'genis-alan': 'Geniş Alan',
  'gokyuzu-olayi': 'Gökyüzü Olayı',
};

function fromRow(row: CatalogRow): CelestialTarget {
  const sizeArcmin = longestAxisArcmin(row.size);
  return {
    slug: row.slug ?? codeSlug(row.code),
    name: row.name ?? `${row.code} ${KIND_NOUN[row.kind]}`,
    catalog: row.code,
    aliases: row.aliases ?? [],
    kind: row.kind,
    constellation: row.constellation,
    ra: formatRa(row.ra),
    dec: formatDec(row.dec),
    magnitude: row.mag,
    angularSize: formatAngularSize(row.size),
    bestMonths: bestMonthsFromRa(row.ra),
    difficulty: difficultyFor(row.mag, sizeArcmin),
    recommendedFocal: recommendedFocalFor(sizeArcmin),
    recommendedFilters: recommendedFiltersFor(row.kind),
    description: describeTarget({
      kind: row.kind,
      constellation: row.constellation,
      magnitude: row.mag,
      sizeArcmin,
      note: row.note,
    }),
    gradient: gradientFor(row.kind),
    moving: false,
  };
}

function fromMovingRow(row: MovingRow): CelestialTarget {
  return {
    slug: row.slug ?? codeSlug(row.code),
    name: row.name,
    catalog: row.code,
    aliases: row.aliases ?? [],
    kind: row.kind,
    constellation: '—',
    // Koordinat alanları bilerek boş: gökyüzündeki yeri tarihe bağlı.
    ra: '',
    dec: '',
    angularSize: row.size ? formatAngularSize(row.size) : '—',
    bestMonths: row.window,
    difficulty: 'Orta',
    recommendedFocal: row.focal,
    recommendedFilters: recommendedFiltersFor(row.kind),
    description: row.note
      ? `${row.name} — konumu tarihe göre değişir. ${row.note}`
      : `${row.name} — konumu tarihe göre değişir; çekim penceresi için efemeris gerekir.`,
    gradient: gradientFor(row.kind),
    moving: true,
  };
}

/**
 * Katalogun tamamı. Sıra bilerek "Messier → diğer derin uzay → güneş
 * sistemi": listeyi ilk açan kişi tanıdık kodlarla karşılaşsın.
 */
export const targets: CelestialTarget[] = [
  ...messier.map(fromRow),
  ...deepSky.map(fromRow),
  ...movingTargets.map(fromMovingRow),
];

/** Sabit koordinatlı hedefler — efemeris ve kadraj hesapları bunları kullanır. */
export const fixedTargets: CelestialTarget[] = targets.filter((t) => !isMovingKind(t.kind));

const bySlug = new Map(targets.map((t) => [t.slug, t]));

export function getTargetBySlug(slug: string): CelestialTarget | undefined {
  return bySlug.get(slug);
}

/**
 * Ad, katalog kodu ya da alias üzerinden arama.
 *
 * Alias'ları da taramak şart: kullanıcı "NGC 224" yazdığında M 31'i
 * bulamayan bir katalog, aynı cismi iki ayrı hedef sanmasına yol açar.
 */
export function searchTargets(query: string, limit = 20): CelestialTarget[] {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  if (!q) return targets.slice(0, limit);

  const normalized = q.replace(/\s+/g, '');
  const scored: { target: CelestialTarget; score: number }[] = [];

  for (const target of targets) {
    const haystacks = [
      target.catalog,
      target.name,
      ...target.aliases,
      target.constellation,
    ].map((h) => h.toLocaleLowerCase('tr-TR'));

    // "m31" ve "m 31" aynı sonucu vermeli; boşluk kullanıcı tarafında
    // rastgeledir ve arama onu ayırt edici bir bilgi saymamalı.
    const compact = haystacks.map((h) => h.replace(/\s+/g, ''));

    let score = -1;
    if (compact.some((h) => h === normalized)) score = 0;
    else if (compact.some((h) => h.startsWith(normalized))) score = 1;
    else if (haystacks.some((h) => h.includes(q))) score = 2;

    if (score >= 0) scored.push({ target, score });
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.target);
}
