import { Select } from '@/components/ui/Input';
import { FilterCell, filterControlClass } from '@/components/ui/FilterBar';

/**
 * İLÇE SÜZGECİ — üç liste sayfasının ortak hücresi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ORTAK BİR BİLEŞEN
 *
 * Aynı süzgeç ilanlarda, etkinliklerde ve kulüplerde var. Üçüne ayrı
 * yazılsaydı "hiç ilçe yoksa çizme" kuralı üç yerde tekrarlanır ve
 * birinde unutulduğunda o sayfa boş bir menü gösterirdi — kullanıcı
 * açar, tek seçenek görmez ve süzgecin bozuk olduğunu düşünür.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BOŞSA HİÇ ÇİZİLMİYOR
 *
 * Kural `personalFacets.ts` ile aynı: çalışmayan bir kontrolü
 * göstermemek, gösterip boş sonuç döndürmekten iyi. İlçe alanı yeni ve
 * mevcut kayıtların hiçbirinde dolu değil; kullanıcılar ilan/etkinlik
 * girdikçe süzgeç kendiliğinden belirecek.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEÇENEKLER VERİDEN, SABİT LİSTEDEN DEĞİL
 *
 * Şehir süzgeci 81 ilin tamamını gösteriyor — liste sabit ve kullanıcı
 * kendi ilini arıyor. İlçede 974 seçenek sunmak, çoğu tıklamanın boş
 * liste ile bitmesi demekti. Burada yalnızca GERÇEKTEN kaydı olan
 * ilçeler var ve yanlarında sayıları yazıyor.
 *
 * Sıralama Türkçe alfabetik: sayıya göre sıralamak "en çok ilan hangi
 * ilçede" sorusunu cevaplardı ama kullanıcının sorusu o değil, kendi
 * ilçesini bulmak.
 */
export function DistrictFilterCell({
  id,
  counts,
  selected,
  onSelect,
}: {
  id: string;
  /** `explorer.counts('ilce')` çıktısı. */
  counts: Map<string, number>;
  selected: string | undefined;
  /** `undefined` seçimi kaldırıyor. */
  onSelect: (value: string | undefined) => void;
}) {
  if (counts.size === 0) return null;

  const ilceler = [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], 'tr')
  );

  return (
    <FilterCell label="İlçe" htmlFor={id} active={Boolean(selected)}>
      <Select
        id={id}
        value={selected ?? 'hepsi'}
        onChange={(e) =>
          onSelect(e.target.value === 'hepsi' ? undefined : e.target.value)
        }
        className={filterControlClass}
      >
        <option value="hepsi">Tüm ilçeler</option>
        {ilceler.map(([ad, adet]) => (
          <option key={ad} value={ad}>
            {ad} ({adet})
          </option>
        ))}
      </Select>
    </FilterCell>
  );
}
