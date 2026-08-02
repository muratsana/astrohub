import { useEffect, useId, useState } from 'react';
import { FilterCell, filterControlClass } from './FilterBar';
import { cn } from '@/lib/cn';
import type { RangeSpec, RangeValue } from '@/features/explorer/query';

/**
 * ARALIK SÜZGECİ — tarih ve sayı (§7.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * TEK HÜCRE, İKİ KUTU, BİR ONAY
 *
 * İki ucu ayrı `FilterCell`e koymak denendi ve bırakıldı: ızgarada
 * yan yana düşmeleri garanti değil ve "en az" ile "en çok" ayrı satırlara
 * bölününce ikisinin AYNI süzgeç olduğu okunmuyor. Tek hücre, içinde iki
 * kutu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YAZARKEN DEĞİL, BIRAKINCA UYGULANIYOR
 *
 * Sayı kutusu her tuş vuruşunda süzerse "1500" yazan kullanıcı sırasıyla
 * 1, 15, 150 ve 1500 aralıklarını görür — liste dört kez boşalıp dolar ve
 * arada URL'ye dört kayıt yazılır. Arama kutusunun gecikmesi burada
 * yetmiyor çünkü ara değerler ANLAMLI görünüyor: 1 ₺ alt sınırı geçerli
 * bir aralık, yalnızca kullanıcının istediği değil.
 *
 * `blur` ve `Enter` uyguluyor; kutunun kendi değeri yerel durumda
 * tutuluyor. Dışarıdan değişirse (chip kaldırma, "hepsini temizle",
 * paylaşılan bağlantı) yerel durum da tazeleniyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "BOŞLARI DA GÖSTER" NEDEN VAR
 *
 * Aralık süzgeci değeri BİLİNMEYEN kaydı eleyerek başlıyor — bilmediğimiz
 * bir fiyatın 0–5000 arasında olduğunu söyleyemeyiz. Ama bu sessiz bir
 * kayıp: kullanıcı listenin neden kısaldığını göremez. Onay kutusu hem
 * kaybı GÖRÜNÜR yapıyor hem de geri almanın yolunu veriyor.
 */
export function RangeFilter<T>({
  spec,
  value,
  onChange,
  className,
}: {
  spec: RangeSpec<T>;
  /** Seçili aralık; hiç seçim yoksa `undefined`. */
  value: RangeValue | undefined;
  onChange: (next: Partial<RangeValue>) => void;
  className?: string;
}) {
  const id = useId();
  const tarih = spec.kind === 'date';

  /** Sınır → kutunun göstereceği metin. */
  const metin = (n: number | null): string => {
    if (n === null) return '';
    if (!tarih) return String(n);
    return new Date(n).toISOString().slice(0, 10);
  };

  const [min, setMin] = useState(() => metin(value?.min ?? null));
  const [max, setMax] = useState(() => metin(value?.max ?? null));

  /* Dış değişiklikleri kutuya yansıt. Kullanıcı yazarken tetiklenmiyor:
     yazma sırasında `value` değişmiyor, yalnızca uygulandığında. */
  const disMin = metin(value?.min ?? null);
  const disMax = metin(value?.max ?? null);
  useEffect(() => setMin(disMin), [disMin]);
  useEffect(() => setMax(disMax), [disMax]);

  /**
   * Kutudaki metni sınıra çevirir.
   *
   * BOŞ KUTU `null` — yani "bu uç açık". Sıfır ile boşu ayırmak şart:
   * `Number('')` sıfır verir ve "en az 0 ₺" ile "alt sınır yok" aynı
   * şey değil. Birincisi ücretsiz ilanları da kapsayan bir SEÇİM,
   * ikincisi seçim yokluğu — chip'te de farklı görünüyorlar.
   */
  const cozumle = (raw: string): number | null => {
    const t = raw.trim();
    if (!t) return null;
    if (tarih) return /^\d{4}-\d{2}-\d{2}$/.test(t) ? Date.parse(`${t}T00:00:00Z`) : null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const uygula = (uc: 'min' | 'max', raw: string) => {
    const n = cozumle(raw);
    /* Üst sınır GÜN SONU: "2 Ağustos'a kadar" o günü DAHİL ediyor.
       Gün başını sınır alsaydık o günün kayıtları dışarıda kalır ve
       süzgeç bir gün eksik çalışırdı. */
    onChange({ [uc]: n !== null && tarih && uc === 'max' ? n + 86_399_999 : n });
  };

  const kutu = (uc: 'min' | 'max', yerel: string, setYerel: (v: string) => void) => (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <input
        id={`${id}-${uc}`}
        type={tarih ? 'date' : 'number'}
        inputMode={tarih ? undefined : 'numeric'}
        step={tarih ? undefined : spec.step}
        value={yerel}
        aria-label={`${spec.label} ${uc === 'min' ? 'en az' : 'en çok'}`}
        placeholder={tarih ? undefined : uc === 'min' ? 'en az' : 'en çok'}
        onChange={(e) => setYerel(e.target.value)}
        onBlur={(e) => uygula(uc, e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          /* Form içinde değil ama ileride olursa gönderimi tetiklemesin. */
          e.preventDefault();
          uygula(uc, (e.target as HTMLInputElement).value);
        }}
        className={cn(filterControlClass, 'min-w-0 font-sans')}
      />
      {!tarih && spec.unit && (
        <span aria-hidden className="shrink-0 text-meta text-faint">
          {spec.unit}
        </span>
      )}
    </span>
  );

  return (
    <FilterCell label={spec.label} htmlFor={`${id}-min`} className={className}>
      <span className="flex items-center gap-1.5">
        {kutu('min', min, setMin)}
        <span aria-hidden className="shrink-0 text-meta text-faint">
          –
        </span>
        {kutu('max', max, setMax)}
      </span>
      <label className="mt-1 flex items-center gap-1.5 text-meta text-muted-foreground">
        <input
          type="checkbox"
          checked={value?.includeEmpty ?? false}
          onChange={(e) => onChange({ includeEmpty: e.target.checked })}
          className="h-3.5 w-3.5 accent-primary"
        />
        Değeri girilmemiş kayıtlar da
      </label>
    </FilterCell>
  );
}
