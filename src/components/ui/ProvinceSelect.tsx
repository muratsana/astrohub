import { useEffect, useState } from 'react';
import { Select } from './Input';
import { fetchProvinces, type Province } from '@/services/content/provinces';

/**
 * İL SEÇİCİ — formlarda tek kaynak (§4.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖNCESİ: SERBEST METİN
 *
 * İlan formunda ve profil düzenlemede şehir alanı düz bir metin kutusuydu.
 * Kullanıcı ne yazarsa o kaydediliyordu: "Muğla", "Mugla", "MUĞLA",
 * "mugla / bodrum", "Bodrum". Pazaryerindeki şehir süzgeci bu değerlerden
 * üretiliyor, yani aynı il listede dört kez görünüyor ve hiçbir süzgeç
 * hepsini birden bulamıyordu. Belgenin "modül bazında hardcode etmeyin,
 * hepsi tek `provinces` kaynağından beslensin" maddesinin karşılığı bu:
 * yalnızca liste değil, YAZIM da tek olmalı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `select`, ARAMALI BİR KUTU DEĞİL
 *
 * Form alanı; klavyeyle yazınca tarayıcı zaten listede atlıyor, mobilde
 * yerel seçici açılıyor ve ekran okuyucu için ek bir kabuk gerekmiyor.
 * Konum seçicideki aramalı liste bir MENÜ (81 satır, gezinme bağlamı);
 * ikisini aynı bileşene zorlamak ikisini de bozardı.
 *
 * ESKİ DEĞER KAYBOLMUYOR: kayıtta listede olmayan bir şehir yazıyorsa
 * (serbest metin döneminden kalma) o değer kendi seçeneği olarak
 * ekleniyor. Aksi hâlde formu açan kullanıcı, kaydetmeden önce şehrinin
 * sessizce silindiğini görürdü.
 */
export function ProvinceSelect({
  id,
  value,
  onChange,
  required,
  /** Boş seçeneğin metni; alan zorunlu değilse "belirtilmedi" anlamında. */
  placeholder = 'Şehir seçin',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [provinces, setProvinces] = useState<Province[]>([]);

  useEffect(() => {
    let active = true;
    fetchProvinces()
      .then((r) => {
        if (active) setProvinces(r.items.filter((p) => p.isActive));
      })
      .catch(() => {
        /* Liste gelmezse seçenek yok; mevcut değer aşağıda korunuyor. */
      });
    return () => {
      active = false;
    };
  }, []);

  const known = provinces.some((p) => p.name === value);

  return (
    <Select
      id={id}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {value && !known && (
        /* Kayıttaki eski/serbest değer — silinmiyor, listenin başında. */
        <option value={value}>{value} (listede yok)</option>
      )}
      {provinces.map((p) => (
        <option key={p.code} value={p.name}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}
