import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './Input';
import { Badge } from './Badge';
import { Button } from './Button';
import {
  fetchAllDistricts,
  searchDistricts,
  type DistrictWithProvince,
} from '@/services/content/districts';

/**
 * KONUM ARAMA KUTUSU — "gölb" yazınca Ankara Gölbaşı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İKİ AÇILIR LİSTE YERİNE TEK KUTU
 *
 * İlk sürüm iki kademeliydi: önce il seç, sonra ilçe. Doğru veriyi
 * topluyordu ama yanlış soruyu önce soruyordu. Kullanıcı "Gölbaşı"
 * yazmak istediğinde, önce onun hangi ilde olduğunu hatırlamak zorunda
 * kalıyordu — oysa aramasının sebebi tam olarak o bilgiyi aramaktı.
 * Ankara'da da Adıyaman'da da bir Gölbaşı var ve ikisini ayırt etmek
 * kullanıcının değil, listenin işi.
 *
 * Tek kutu her iki yönde de çalışıyor: "gölb", "ankara", "ankara gölb"
 * ve "golbasi" aynı sonuca götürüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEÇİM TEK HAREKETTE İKİ ALANI DOLDURUYOR
 *
 * Kutu bir ilçe döndürmüyor, bir İL+İLÇE ÇİFTİ döndürüyor. İkisini ayrı
 * doldurmak, kullanıcının seçtiği ilçenin ilinden farklı bir il seçili
 * kalmasına açık kapı bırakırdı — form geçerli görünür, veri saçma
 * olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEÇİLDİKTEN SONRA KUTU DEĞİL ÖZET
 *
 * Seçim yapıldığında metin kutusu yerini bir özet satırına bırakıyor
 * ("Gölbaşı · Ankara" + "Değiştir"). Kutunun içinde seçili metni
 * bırakmak, kullanıcının bir harf silip yanlışlıkla seçimi bozmasına
 * yol açıyordu ve alanın DOLU olduğu da net görünmüyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * LİSTE YOKSA NE OLUYOR
 *
 * Sunucu yapılandırılmamışsa ya da istek başarısızsa liste boş kalıyor
 * ve kutu bunu SÖYLÜYOR. Sessizce boş bir öneri listesi göstermek,
 * kullanıcının yazdığı ilçenin var olmadığı izlenimini verirdi.
 */
export function LocationTypeahead({
  id,
  city,
  district,
  onSelect,
  onClear,
  required,
}: {
  id: string;
  /** Seçili il; boşsa seçim yok. */
  city: string;
  district: string;
  onSelect: (secim: { city: string; district: string }) => void;
  onClear: () => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DistrictWithProvince[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>(
    'idle'
  );
  const kutu = useRef<HTMLDivElement>(null);

  const secili = Boolean(city && district);

  /*
    Liste kullanıcı KUTUYA DOKUNDUĞUNDA iniyor, sayfa açılırken değil.
    974 satır 154 kB (sıkıştırılmış ~30 kB) ve fotoğraf yükleyen herkes
    konum adımına gelmiyor; gelmeyenlere bu maliyeti yüklememek doğru
    olan.
  */
  useEffect(() => {
    if (state !== 'idle' || (!open && query === '')) return;
    setState('loading');
    fetchAllDistricts()
      .then((liste) => {
        setItems(liste);
        setState(liste.length > 0 ? 'ready' : 'failed');
      })
      .catch(() => setState('failed'));
  }, [open, query, state]);

  const sonuclar = useMemo(
    () => searchDistricts(items, query),
    [items, query]
  );

  function sec(d: DistrictWithProvince) {
    onSelect({ city: d.provinceName, district: d.name });
    setQuery('');
    setOpen(false);
  }

  if (secili) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-primary/40 bg-surface-2 px-3 py-2.5">
        <Badge tone="primary">{district}</Badge>
        <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">
          {city}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onClear();
            setOpen(true);
          }}
        >
          Değiştir
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={kutu}>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        required={required}
        placeholder="İlçe ya da il yazın — ör. Gölbaşı, Ankara"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && (
        <div className="absolute left-0 right-0 z-[var(--z-popover)] mt-1 overflow-hidden rounded-card border border-border-strong bg-surface-1 shadow-overlay">
          {state === 'failed' ? (
            <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
              İlçe listesi yüklenemedi. Bağlantınızı kontrol edip
              yeniden deneyin.
            </p>
          ) : query.trim() === '' ? (
            <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
              {state === 'loading'
                ? 'İlçe listesi yükleniyor…'
                : 'Aramaya başlayın — ilçe ya da il adı yazabilirsiniz.'}
            </p>
          ) : sonuclar.length === 0 ? (
            <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
              Eşleşen ilçe yok. Yazımı kontrol edin; il adıyla da
              arayabilirsiniz.
            </p>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {sonuclar.map((d) => (
                <li key={`${d.provinceCode}-${d.slug}`}>
                  <button
                    type="button"
                    onClick={() => sec(d)}
                    className="flex w-full items-baseline gap-2 border-b border-border px-3 py-2 text-left transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">
                      {d.name}
                    </span>
                    <span className="shrink-0 text-meta text-muted-foreground">
                      {d.provinceName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        /* Dışarı tıklayınca kapanma. `blur` ile yapılsaydı listedeki
           düğmeye tıklamak, tıklama işlenmeden önce listeyi kapatırdı. */
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 cursor-default"
        />
      )}
    </div>
  );
}
