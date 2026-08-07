import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { KatalogNesnesi, KatalogSayfasi } from './katalog';

/**
 * GÖKYÜZÜ KATALOĞU LİSTESİ — kartlar gerçekten çiziliyor mu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN TAKLİT EDİLİYOR
 *
 * Sayfanın verisi tamamen sunucudan geliyor ve tohum karşılığı yok.
 * Gerçek bir çağrı yapmak testi ağa ve üretim veritabanına bağlardı;
 * ikisi de bir birim testinde olmamalı.
 *
 * Taklit edilen tek şey VERİ. Kart bileşeni, önizleme görseli, rozet ve
 * bağlantı hedefi gerçek — ölçülen de tam olarak onlar. Sunucu
 * sorgusunun kendisi ayrı ölçülüyor (`katalog.test.ts` sorgu
 * ayrıştırmasını, migration'daki RPC'nin doğruluğu ise veritabanında
 * çalıştırılarak).
 */

const NESNE: KatalogNesnesi = {
  id: 'id-sh2-155',
  slug: 'sh2-155',
  name: 'Mağara Bulutsusu',
  catalog: 'Sh2-155',
  aliases: ['C 9', 'LBN 529'],
  kind: 'emisyon-bulutsusu',
  constellation: 'Kral',
  ra: '22ʰ 57ᵐ 00ˢ',
  dec: '+62° 38′',
  raDeg: 344.25,
  decDeg: 62.633,
  sizeArcmin: 50,
  magnitude: 7.7,
  angularSize: '50′',
  bestMonths: 'Ağustos – Aralık',
  difficulty: 'Orta',
  recommendedFocal: '300–700 mm',
  recommendedFilters: 'SHO',
  description: 'Kral takımyıldızında bir emisyon bulutsusu.',
  gradient: 'radial-gradient(#000, #111)',
  moving: false,
  uzaklikLy: 2400,
  secki: true,
  kodlar: ['Sh2-155', 'C 9', 'LBN 529'],
};

const SAYFA: KatalogSayfasi = { toplam: 1, satirlar: [NESNE] };

vi.mock('./katalog', async () => {
  const gercek = await vi.importActual<typeof import('./katalog')>('./katalog');
  return {
    ...gercek,
    useKatalog: () => ({ data: SAYFA, isLoading: false, isError: false }),
    useKatalogOzeti: () => ({
      data: {
        toplam: 16663,
        secki: 3273,
        kod: 46051,
        turler: [{ tur: 'emisyon-bulutsusu', adet: 900 }],
        takimyildizlar: [{ ad: 'Kral', adet: 500 }],
      },
    }),
  };
});

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => null,
}));

const { SkyCatalogPage } = await import('./SkyCatalogPage');

function ciz(adres = '/araclar/gokyuzu-katalogu') {
  return render(
    <MemoryRouter initialEntries={[adres]}>
      <SkyCatalogPage />
    </MemoryRouter>
  );
}

describe('SkyCatalogPage', () => {
  it('nesneyi kart olarak çizer ve hedef sayfasına bağlar', () => {
    ciz();
    const bag = screen.getByRole('link', { name: /Sh2-155/ });
    expect(bag).toHaveAttribute('href', '/hedef/sh2-155');
    expect(within(bag).getByText('Mağara Bulutsusu')).toBeInTheDocument();
  });

  it('seçki rozetini yalnızca seçkideki nesnede gösterir', () => {
    ciz();
    expect(screen.getByText('Seçki')).toBeInTheDocument();
  });

  it('uzaklığı okunur birime çevirir', () => {
    // 2.400 ışık yılı "2,4 bin ışık yılı" DEĞİL: on binin altı tam yazılıyor.
    ciz();
    expect(screen.getByText(/2\.400 ışık yılı/)).toBeInTheDocument();
  });

  it('önizleme görselini gerçek koordinattan kurar', () => {
    ciz();
    const gorsel = screen.getByRole('img', {
      name: /Sh2-155 — gökyüzü tarama önizlemesi/,
    });
    const src = gorsel.getAttribute('src') ?? '';
    expect(src).toContain('hips2fits');
    expect(src).toContain('ra=344.250000');
    expect(src).toContain('dec=62.633000');
    /* Kadraj cismin boyutunun 2,4 katı: 50′ × 2,4 = 120′ = 2°. Görsel
       geniş olduğu için oran kısa kenardan büyütülmüyor. */
    expect(src).toContain('fov=2.0000');
  });

  it('adresteki filtreleri seçili gösterir', () => {
    ciz('/araclar/gokyuzu-katalogu?aile=Sh2-%25&secki=1&sirala=boyut');
    expect(screen.getByLabelText('Katalog')).toHaveValue('Sh2-%');
    expect(screen.getByLabelText('Sırala')).toHaveValue('boyut');
    expect(
      screen.getByRole('checkbox', { name: /çekmeye değer seçki/i })
    ).toBeChecked();
  });

  it('kaynakları sayfanın altında bildirir', () => {
    // Veri üçüncü taraf kataloglardan; atıf olmadan yayımlamak doğru değil.
    ciz();
    expect(screen.getByText(/OpenNGC/)).toBeInTheDocument();
    expect(screen.getByText(/Imm Deep Sky Compendium/)).toBeInTheDocument();
    expect(screen.getByText(/Digitized Sky Survey/)).toBeInTheDocument();
  });
});
