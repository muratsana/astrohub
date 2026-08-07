import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/services/supabase/client';
import {
  targets as targetSeed,
  type CelestialTarget,
} from '@/features/targets/data';
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
  type Difficulty,
  type TargetKind,
} from '@/domain/targets/derive';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * HEDEF KATALOĞU — veritabanı satırından arayüz modeline.
 *
 * Veritabanı koordinatları **derece** olarak tutar (§8.2 gerekçesi:
 * "20sa 58dk 47sn" gibi metinler sıralanamaz ve hesaba giremez). Arayüz ise
 * okunabilir biçim ister. Çevirme burada, tek yerde.
 *
 * Türetilen alanlar (en uygun ay, zorluk, önerilen odak) satırda doluysa
 * satırdaki değer kazanır: editör bir kaydı elle düzelttiyse, kural onu
 * geri almamalı. Boşsa aynı kural motoru tohum veride olduğu gibi çalışır —
 * böylece veritabanına taşınmış bir kayıt, taşınmamış bir kayıttan farklı
 * görünmüyor.
 */

interface TargetRow {
  id: string;
  slug: string;
  name: string;
  catalog: string;
  kind: string;
  constellation: string;
  ra_deg: number | string | null;
  dec_deg: number | string | null;
  magnitude: number | string | null;
  size_major_arcmin: number | string | null;
  size_minor_arcmin: number | string | null;
  best_months: string | null;
  difficulty: string | null;
  recommended_focal: string | null;
  recommended_filters: string | null;
  description: string | null;
  catalog_identifiers?: { code: string; is_primary: boolean }[] | null;
}

/** PostgREST `numeric`i metin olarak serileştirir; sınırda bir kez çeviriyoruz. */
function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const DIFFICULTIES: Difficulty[] = ['Kolay', 'Orta', 'Zor'];

function asDifficulty(value: string | null): Difficulty | null {
  return DIFFICULTIES.find((d) => d === value) ?? null;
}

export function mapTargetRow(row: TargetRow): CelestialTarget {
  const kind = row.kind as TargetKind;
  const raDeg = num(row.ra_deg);
  const decDeg = num(row.dec_deg);
  const raHours = raDeg === null ? null : raDeg / 15;

  const major = num(row.size_major_arcmin);
  const minor = num(row.size_minor_arcmin);
  // Eşit eksenlerin tek değere inmesi `formatAngularSize`ın işi; burada
  // ikinci bir kural yazmak, iki yerin ayrışmasına açık kapı bırakırdı.
  const sizeText =
    major === null ? '' : minor === null ? String(major) : `${major}x${minor}`;
  const sizeArcmin = longestAxisArcmin(sizeText);
  const magnitude = num(row.magnitude) ?? undefined;

  const aliases = (row.catalog_identifiers ?? [])
    .filter((c) => !c.is_primary && c.code !== row.catalog)
    .map((c) => c.code);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    catalog: row.catalog,
    aliases,
    kind,
    constellation: row.constellation,
    ra: raHours === null ? '' : formatRa(raHours),
    dec: decDeg === null ? '' : formatDec(decDeg),
    raDeg,
    decDeg,
    sizeArcmin: sizeArcmin || null,
    magnitude,
    angularSize: sizeText ? formatAngularSize(sizeText) : '—',
    bestMonths:
      row.best_months ??
      (raHours === null ? 'Tarihe bağlı' : bestMonthsFromRa(raHours)),
    difficulty:
      asDifficulty(row.difficulty) ?? difficultyFor(magnitude, sizeArcmin),
    recommendedFocal:
      row.recommended_focal ?? recommendedFocalFor(sizeArcmin),
    recommendedFilters:
      row.recommended_filters ?? recommendedFiltersFor(kind),
    /*
     * Açıklama boşsa kuraldan üretiliyor: 230 kaydın açıklamasını
     * veritabanına kopyalamak, kural değişince eskimiş 230 kopya
     * bırakırdı. Editör elle yazdıysa satırdaki metin kazanır.
     */
    description:
      row.description && row.description.trim().length > 0
        ? row.description
        : describeTarget({
            kind,
            constellation: row.constellation,
            magnitude,
            sizeArcmin,
          }),
    gradient: gradientFor(kind),
    moving: isMovingKind(kind),
  };
}

const SELECT =
  'id, slug, name, catalog, kind, constellation, ra_deg, dec_deg, magnitude, ' +
  'size_major_arcmin, size_minor_arcmin, best_months, difficulty, ' +
  'recommended_focal, recommended_filters, description, ' +
  'catalog_identifiers(code, is_primary)';

async function fetchTargets(client: SupabaseClient): Promise<CelestialTarget[]> {
  const { data, error } = await client
    .from('celestial_objects')
    .select(SELECT)
    .order('catalog');

  if (error) throw new Error(error.message);
  return (data as unknown as TargetRow[]).map(mapTargetRow);
}

/** Hedef kataloğu: veritabanı varsa oradan, yoksa tohum diziden. */
export function useTargetCatalog(): ContentSelection<CelestialTarget> {
  return useCatalog('hedef', targetSeed, fetchTargets);
}

/**
 * KATALOG ARAMASI — SUNUCUDA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İSTEMCİDE DEĞİL
 *
 * Katalog 16.149 kayıt (NGC, IC, Messier, Caldwell, Sharpless, Barnard,
 * LBN, LDN, vdB, Ced, RCW, Arp, Hickson). Paketlenmiş `catalog.ts` bu
 * kayıtların yalnızca en bilinen 230'unu taşıyor ve öyle kalması
 * gerekiyor: tamamı JavaScript paketine girseydi paket bütçesi (200 kB
 * gzip) üç katına çıkardı.
 *
 * Tabloyu çalışma anında çekmek de çözüm değil — kayıtlar katalog
 * kodlarıyla ~9 MB ve PostgREST'in varsayılan satır tavanı 1.000, yani
 * istemci sessizce kataloğun on altıda birini görürdü.
 *
 * Bu yüzden yazılan sorgu sunucuya gidiyor ve en fazla birkaç düzine
 * satır dönüyor. Sıralama da orada (`hedef_ara`): kod tam eşleşmesi
 * önce, sonra kod öneki, sonra ad.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PAKETLENMİŞ LİSTE HÂLÂ İŞİNİ YAPIYOR
 *
 * Arama sonucu gelene kadar (ve Supabase yapılandırılmamışsa hiç
 * gelmeyeceğinde) paketlenmiş listedeki eşleşmeler gösteriliyor. Yani
 * en bilinen hedefler ağ olmadan da anında bulunuyor; sunucu sonucu
 * geldiğinde liste sessizce genişliyor.
 */
interface SearchRow extends Omit<TargetRow, 'catalog_identifiers'> {
  kodlar: string[] | null;
}

const ARAMA_ADEDI = 40;

export async function searchCatalog(
  q: string,
  kind?: string
): Promise<CelestialTarget[]> {
  const terim = q.trim();
  if (terim.length < 2) return [];

  const { getSupabase } = await import('@/services/supabase/client');
  const promise = getSupabase();
  if (!promise) return [];

  const client = await promise;
  const { data, error } = await client.rpc('hedef_ara', {
    q: terim,
    tur: kind && kind !== 'hepsi' ? kind : null,
    adet: ARAMA_ADEDI,
  });

  if (error) throw new Error(error.message);

  return ((data ?? []) as SearchRow[]).map((row) =>
    mapTargetRow({
      ...row,
      /* RPC kodları düz dizi veriyor; `mapTargetRow` ilişki biçimini
         bekliyor. Birincil kod `catalog` alanında zaten var, o yüzden
         hepsini `is_primary: false` işaretlemek doğru sonucu veriyor:
         eşleşen kod takma ad listesinden zaten eleniyor. */
      catalog_identifiers: (row.kodlar ?? []).map((code) => ({
        code,
        is_primary: false,
      })),
    })
  );
}

/**
 * Arama kancası — yazarken değil, DURDUKTAN sonra sorar.
 *
 * Her tuşta istek atmak sekiz harflik bir kodda sekiz istek demek ve
 * yedisinin cevabı çöpe gidiyor. 250 ms, yazmayı bölmeyen ama tuş
 * başına istek atmayan aralık.
 */
export function useCatalogSearch(
  q: string,
  kind?: string
): { rows: CelestialTarget[]; loading: boolean } {
  const [gecikmis, setGecikmis] = useState(q);

  useEffect(() => {
    const zamanlayici = setTimeout(() => setGecikmis(q), 250);
    return () => clearTimeout(zamanlayici);
  }, [q]);

  const query = useQuery({
    queryKey: ['hedef-ara', gecikmis.trim().toLowerCase(), kind ?? 'hepsi'],
    enabled: isSupabaseConfigured && gecikmis.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: () => searchCatalog(gecikmis, kind),
  });

  return {
    rows: query.data ?? [],
    /* Gecikme penceresi de "yükleniyor" sayılıyor: kullanıcı yazmayı
       bitirdiği anda listenin donmuş görünmesi, isteğin hiç gitmediği
       izlenimi verirdi. */
    loading:
      isSupabaseConfigured &&
      q.trim().length >= 2 &&
      (query.isFetching || gecikmis !== q),
  };
}

/**
 * Slug'dan veritabanı kimliği.
 *
 * Katalog henüz taşınmadıysa kimlik yoktur ve `null` döner; yükleme akışı
 * bu durumda hedef bağını kurmaz ve adı serbest metin olarak saklar.
 * Uydurma bir UUID göndermek yabancı anahtar hatasıyla yüklemeyi tümden
 * düşürürdü.
 */
export async function resolveTargetId(slug: string): Promise<string | null> {
  if (!slug) return null;
  const { getSupabase } = await import('@/services/supabase/client');
  const promise = getSupabase();
  if (!promise) return null;

  const client = await promise;
  const { data, error } = await client
    .from('celestial_objects')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return null;
  return (data as { id: string } | null)?.id ?? null;
}
