import { StarField } from '@/components/media/StarField';

/**
 * HERO MOCKUP'LARI — beş modülün minyatür arayüz render'ı.
 *
 * Bunlar ekran görüntüsü değil, gerçek bileşen diliyle çizilmiş küçültülmüş
 * arayüzlerdir: aynı token'lar, aynı çizgi kalınlıkları, aynı tipografi.
 * Böylece hero'daki görüntü ile sitenin kendisi arasında fark oluşmaz ve
 * tasarım değiştiğinde hero da kendiliğinden güncellenir.
 *
 * Hepsi `aria-hidden`: anlam, yanlarındaki başlık ve açıklamada taşınır.
 */

const cell = 'border-border bg-surface-1';

/** 1 — GALERİ: künyeli karo ızgarası. */
export function GalleryMock() {
  const tiles = [
    { code: 'NGC 7000', meta: 'SHO · 14s20d', tint: '232,140,110' },
    { code: 'M 31', meta: 'LRGB · 9s05d', tint: '150,185,235' },
    { code: 'IC 434', meta: 'HOO · 22s40d', tint: '190,120,140' },
    { code: 'M 42', meta: 'RGB · 3s12d', tint: '120,200,180' },
  ];

  return (
    <div aria-hidden className="grid h-full grid-cols-2 gap-1.5 p-2">
      {tiles.map((t) => (
        <div key={t.code} className={`overflow-hidden border ${cell}`}>
          <div className="relative aspect-[4/3]">
            <StarField seed={`hero-${t.code}`} tint={t.tint} density={0.7} />
          </div>
          <div className="border-t border-border px-1.5 py-1">
            <p className="truncate font-display text-[8px] font-bold uppercase leading-tight text-foreground">
              {t.code}
            </p>
            <p className="tabular truncate text-[6.5px] leading-tight text-cold">
              {t.meta}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 2 — ETKİNLİKLER: takvim tablosu. */
export function EventsMock() {
  const rows = [
    ['12 AĞU', 'Perseid Gözlem Kampı', 'ANTALYA'],
    ['24 AĞU', 'Halk Gözlemi', 'ANKARA'],
    ['06 EYL', 'Astrofoto Atölyesi', 'İZMİR'],
    ['19 EYL', 'Ay Tutulması Gecesi', 'BURSA'],
    ['02 EKİ', 'Karanlık Gökyüzü Kampı', 'KAYSERİ'],
  ];

  return (
    <div aria-hidden className="flex h-full flex-col p-2.5">
      <div className="flex items-center gap-1.5 pb-1.5">
        <span className="text-[7px] uppercase tracking-[0.18em] text-muted-foreground">
          Takvim
        </span>
        <span className="h-px flex-1 bg-border" />
        <span className="text-[7px] uppercase tracking-[0.18em] text-primary">
          12 kayıt
        </span>
      </div>
      <div className="flex gap-1 border-b border-border-strong pb-1">
        {['TARİH', 'ETKİNLİK', 'ŞEHİR'].map((h, i) => (
          <span
            key={h}
            className={`text-[6.5px] uppercase tracking-[0.14em] text-muted-foreground ${
              i === 1 ? 'flex-1' : 'w-11 shrink-0'
            }`}
          >
            {h}
          </span>
        ))}
      </div>
      {rows.map(([date, title, city]) => (
        <div
          key={title}
          className="flex items-center gap-1 border-b border-border py-[5px]"
        >
          <span className="tabular w-11 shrink-0 text-[7px] text-primary">
            {date}
          </span>
          <span className="flex-1 truncate text-[7.5px] text-foreground">
            {title}
          </span>
          <span className="w-11 shrink-0 truncate text-[6.5px] text-cold">
            {city}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 3 — SAHA: gözlem noktası kartı + Bortle ölçümleri. */
export function FieldMock() {
  return (
    <div aria-hidden className="flex h-full flex-col p-2">
      <div className="relative flex-1 overflow-hidden border border-border">
        <StarField seed="hero-saklikent" tint="150,185,235" density={1.8} />
        <span className="absolute left-1.5 top-1.5 border border-border-strong bg-background/85 px-1 py-px text-[6px] uppercase tracking-[0.14em] text-primary">
          Bortle 2
        </span>
        {/* Konum işareti */}
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary">
          <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
        </span>
      </div>

      <p className="mt-1.5 truncate font-display text-[9px] font-bold uppercase text-foreground">
        Aladağlar Gözlem Alanı
      </p>

      <div className="mt-1 grid grid-cols-3 gap-px bg-border">
        {[
          ['SQM', '21.8'],
          ['RAKIM', '2150 m'],
          ['GÜNEY', 'AÇIK'],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface-1 px-1 py-1">
            <p className="text-[5.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <p className="tabular truncate text-[7.5px] text-cold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 4 — ARAÇLAR: FOV hesaplayıcı çıktısı. */
export function ToolsMock() {
  return (
    <div aria-hidden className="flex h-full flex-col p-2.5">
      <div className="flex items-center gap-1.5 pb-2">
        <span className="text-[7px] uppercase tracking-[0.18em] text-muted-foreground">
          FOV Hesabı
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-px bg-border">
        {[
          ['ODAK', '550 mm'],
          ['PİKSEL', '3.76 µm'],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface-1 px-1.5 py-1">
            <p className="text-[5.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <p className="tabular text-[8px] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Kadraj önizlemesi: görüş alanı çerçevesi içinde hedef */}
      <div className="relative mt-2 flex-1 overflow-hidden border border-border">
        <StarField seed="hero-fov" tint="232,140,110" density={0.8} />
        <span className="absolute inset-x-3 inset-y-2 border border-dashed border-primary/70" />
        <span className="absolute bottom-1 right-1 bg-background/85 px-1 text-[6px] text-cold">
          3.1° × 2.1°
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between">
        <span className="text-[6px] uppercase tracking-[0.14em] text-muted-foreground">
          Pixel scale
        </span>
        <span className="tabular text-[9px] font-medium text-primary">
          1.41″/px
        </span>
      </div>
    </div>
  );
}

/** 5 — YAZILAR ve HABERLER: içerik listesi. */
export function ContentMock() {
  const rows = [
    ['HABER', 'Perseid 12 Ağustos’ta zirve yapıyor'],
    ['YAZI', 'Dark, Flat ve Bias: Kalibrasyon'],
    ['HABER', 'İkinci karanlık gökyüzü parkı'],
    ['YAZI', 'SHO Paleti ile Narrowband İşleme'],
    ['YAZI', 'Guiding Sorunları ve Çözümleri'],
  ];

  return (
    <div aria-hidden className="flex h-full flex-col p-2.5">
      <div className="flex items-center gap-1.5 pb-2">
        <span className="text-[7px] uppercase tracking-[0.18em] text-muted-foreground">
          Akış
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {rows.map(([kind, title], i) => (
        <div key={title} className="border-b border-border py-[7px]">
          <div className="flex items-center gap-1.5">
            <span
              className={`border px-1 text-[5.5px] uppercase tracking-[0.14em] ${
                kind === 'HABER'
                  ? 'border-primary/45 text-primary'
                  : 'border-cold/45 text-cold'
              }`}
            >
              {kind}
            </span>
            <span className="tabular text-[6px] text-faint">
              {24 - i * 4} TEM
            </span>
          </div>
          <p className="mt-1 truncate text-[7.5px] leading-tight text-foreground">
            {title}
          </p>
        </div>
      ))}
    </div>
  );
}
