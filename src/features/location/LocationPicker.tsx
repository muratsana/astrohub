import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, PinIcon } from '@/components/ui/icons';
import { useLocationContext } from './LocationContext';
import { findCity } from './cities';
import { matchesProvince, rankProvinces } from '@/services/content/provinces';
import { cn } from '@/lib/cn';

/**
 * KONUM SEÇİCİ — tek bileşen, iki kılık.
 *
 * Daha önce bu menü `StatusBar` içinde gömülüydü. "Bu Gece" paneli de bir
 * seçici isteyince tek seçenek onu kopyalamaktı; iki kopya demek, cihaz
 * konumu davranışının birinde düzelip diğerinde kalması demekti. Bileşen
 * dışarı alındı, iki yer de aynı listeyi gösteriyor.
 *
 * `variant` yalnızca GÖRÜNÜMÜ değiştiriyor: şerit için satır içi küçük bir
 * düğme, panel için dokunulabilir bir kutu. Liste, seçim mantığı ve
 * erişilebilirlik kabuğu ikisinde de aynı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAPANAN HATA: CİHAZ KONUMUNA GERİ DÖNÜLEMİYORDU
 *
 * "Cihaz konumumu kullan" satırı `permission !== 'granted'` koşuluyla
 * çiziliyordu. İzin bir kez verildiğinde satır listeden kayboluyordu —
 * mantık şuydu: "zaten cihaz konumundayız, tekrar sormaya gerek yok".
 *
 * Ama şehir seçmek izni geri almıyor. Kullanıcı Ankara'yı seçtiği anda
 * konum şehre geçiyor, `permission` ise `granted` kalıyor; yani seçenek
 * hâlâ gizli ve cihaz konumuna DÖNMENİN HİÇBİR YOLU YOK. Sayfayı
 * yenilemek de kurtarmıyor, çünkü izin durumu saklanıyor.
 *
 * Doğru koşul izin değil, KONUMUN KAYNAĞI. Satır her zaman görünüyor ve
 * hâlihazırda cihaz konumundaysak seçili işaretleniyor — listedeki
 * şehirlerle aynı davranış.
 */
export function LocationPicker({
  variant = 'compact',
  className,
}: {
  variant?: 'compact' | 'panel';
  className?: string;
}) {
  const {
    location,
    provinces,
    permission,
    mode,
    needsPermissionHelp,
    setCity,
    requestDeviceLocation,
  } =
    useLocationContext();

  const [open, setOpen] = useState(false);
  /*
   * ARAMA 15 ŞEHİRDE GEREKSİZDİ, 81 İLDE ZORUNLU. Kaydırılan bir listede
   * "Şırnak" aramak, yazarak bulmaktan yavaş. Eşleme Türkçe katlanmış
   * adlar üzerinden: "sanliurfa" yazan Şanlıurfa'yı buluyor.
   */
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const onDevice = location.source === 'device';
  const pending = permission === 'pending';

  const visible = useMemo(
    () =>
      rankProvinces(
        provinces.filter((p) => p.isActive && matchesProvince(p, query)),
        query
      ),
    [provinces, query]
  );

  return (
    <div ref={wrapRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'inline-flex items-center gap-1 transition-colors',
          variant === 'compact'
            ? 'min-h-6 text-meta font-medium tracking-[0.03em] text-foreground hover:text-primary'
            : 'min-h-9 rounded-card border border-border bg-surface-1 px-3 py-1.5 text-body-sm font-medium text-foreground hover:border-border-strong hover:text-primary'
        )}
      >
        {variant === 'panel' && (
          <PinIcon aria-hidden className="h-3.5 w-3.5 shrink-0 text-faint" />
        )}
        {location.label}
        {onDevice && (
          <span className="text-meta text-cold" title="Cihaz konumu">
            ◉
          </span>
        )}
        <ChevronDownIcon
          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Gözlem konumu"
          className="absolute left-0 top-full z-[var(--z-popover)] mt-1 max-h-[70vh] w-60 overflow-y-auto rounded-card border border-border-strong bg-surface-1 py-1 shadow-overlay"
        >
          {/*
            HER ZAMAN EN ÜSTTE, HER ZAMAN GÖRÜNÜR. Kaynağa göre işaretli;
            izin durumuna göre gizli değil (bkz. dosya başı).
          */}
          <button
            type="button"
            role="option"
            aria-selected={onDevice}
            disabled={pending}
            onClick={() => {
              requestDeviceLocation();
              setOpen(false);
            }}
            className={cn(
              'block w-full px-3 py-2 text-left text-meta transition-colors hover:bg-surface-2 disabled:opacity-60',
              onDevice ? 'text-primary' : 'text-cold'
            )}
          >
            {/*
              METİN MODA GÖRE. Eskiden yalnızca iki hâl vardı: reddedildi
              ya da değil. Zaman aşımı yaşayan kullanıcıya "izni açın"
              demek, onu olmayan bir ayarı aramaya gönderiyordu.
            */}
            ◉{' '}
            {pending
              ? 'Konum alınıyor…'
              : mode === 'MANUAL' || mode === 'DENIED' || mode === 'ERROR'
                ? 'Otomatik konuma dön'
                : 'Cihaz konumumu kullan'}
            <span className="mt-0.5 block text-meta leading-snug text-faint">
              {needsPermissionHelp
                ? 'İzin reddedilmiş. Tarayıcı adres çubuğundaki kilit simgesinden konum iznini açıp tekrar deneyin.'
                : mode === 'UNAVAILABLE'
                  ? 'Bu tarayıcı cihaz konumunu desteklemiyor ya da bağlantı güvenli değil (HTTPS gerekir).'
                  : mode === 'ERROR'
                    ? 'Konum alınamadı — tekrar denenebilir.'
                    : 'Koordinat sunucuya gönderilmez'}
            </span>
          </button>
          <span aria-hidden className="my-1 block h-px bg-border" />

          <div className="px-2 pb-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İl ara"
              aria-label="İl ara"
              className="h-8 w-full rounded-card border border-border bg-surface-2 px-2 text-meta text-foreground placeholder:text-faint focus-visible:border-primary"
            />
          </div>

          {visible.length === 0 && (
            <p className="px-3 py-2 text-meta leading-snug text-muted-foreground">
              “{query}” için il bulunamadı.
            </p>
          )}

          {visible.map((province) => {
            /* Bortle yalnızca ölçülü illerde yazılıyor; 66 il için elde
               bir değer yok ve tahmin etmek gökyüzü beklentisini yanlış
               kurardı. */
            const bortle = findCity(province.slug)?.bortle;
            const selected = !onDevice && location.label === province.name;
            return (
              <button
                key={province.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setCity(province.slug);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-meta transition-colors hover:bg-surface-2',
                  selected ? 'text-primary' : 'text-foreground'
                )}
              >
                {province.name}
                {bortle != null && (
                  <span className="tabular text-meta text-faint">B{bortle}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
