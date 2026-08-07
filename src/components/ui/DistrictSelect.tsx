import { useEffect, useState } from 'react';
import { Select } from './Input';
import { fetchProvinces } from '@/services/content/provinces';
import { useDistricts } from '@/services/content/districts';

/**
 * İLÇE SEÇİCİ — `ProvinceSelect`in ikinci kademesi (§4.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İL ADINI ALIYOR, KOD DEĞİL
 *
 * `useDistricts` plaka kodu istiyor; formlar ise il ADINI tutuyor
 * (`listings.city`, `events.city` metin sütunları ve `ObservingLocation.
 * provinceName` hep ad). Aradaki çeviriyi her form ayrı yapsaydı, aynı
 * "ad → kod" araması dört yerde tekrarlanırdı ve biri il listesini
 * yüklemeyi unuttuğunda ilçe seçici sessizce boş kalırdı.
 *
 * Çeviri burada, tek yerde: bileşen il adını alıyor, kodu kendisi
 * buluyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İL SEÇİLMEDEN İLÇE SORULMAZ
 *
 * İl boşken alan DEVRE DIŞI ve bunu söylüyor. Alternatif — 974 ilçeyi
 * birden listelemek — hem kullanılamaz bir menü hem de yanlış: aynı adı
 * taşıyan ilçeler var (Merkez, Çay, Sarıyer benzeri) ve il olmadan
 * hangisi olduğu belirsiz kalırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ALAN HER ZAMAN İSTEĞE BAĞLI
 *
 * İlçe zorunlu tutulmuyor. Zaten kayıtlı ilanların ve etkinliklerin
 * hiçbirinde ilçe yok; zorunlu yapmak onları düzenlenemez hâle
 * getirirdi. Boş bırakılan ilçe süzgeçte "belirtilmemiş" olarak da
 * görünmüyor — yalnızca ilçesi olan kayıtlar süzgeçte yer alıyor.
 */
export function DistrictSelect({
  id,
  provinceName,
  value,
  onChange,
  placeholder = 'İlçe (isteğe bağlı)',
}: {
  id: string;
  /** Seçili ilin adı; boşsa alan devre dışı. */
  provinceName: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [code, setCode] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!provinceName) {
      setCode(undefined);
      return;
    }
    let active = true;
    fetchProvinces()
      .then((r) => {
        if (!active) return;
        setCode(r.items.find((p) => p.name === provinceName)?.code);
      })
      .catch(() => {
        /* İl listesi gelmezse ilçe de gelmiyor; alan boş ve devre dışı
           kalıyor. Boş bir menü açıp kullanıcıyı seçim yapmaya
           çalıştırmaktan iyi. */
      });
    return () => {
      active = false;
    };
  }, [provinceName]);

  const ilceler = useDistricts(code);
  const bilinen = ilceler.items.some((d) => d.name === value);

  return (
    <Select
      id={id}
      value={value}
      disabled={!provinceName}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">
        {provinceName ? placeholder : 'Önce il seçin'}
      </option>
      {value && !bilinen && (
        /* Kayıttaki değer listede yoksa korunuyor — `ProvinceSelect` ile
           aynı kural: form açıldığında bir alanın sessizce silinmesi,
           kullanıcının fark etmediği bir veri kaybı olurdu. */
        <option value={value}>{value} (listede yok)</option>
      )}
      {ilceler.items.map((d) => (
        <option key={d.slug} value={d.name}>
          {d.name}
        </option>
      ))}
    </Select>
  );
}
