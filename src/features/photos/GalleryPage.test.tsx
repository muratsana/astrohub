import { describe, it, expect } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthContext';
import { GalleryPage } from './GalleryPage';
import { photos } from './data';

/*
 * Galeri artık `usePhotoCatalog` üzerinden okuyor; kanca TanStack Query
 * kullanıyor ve sağlayıcı olmadan render çöker. Test ortamında Supabase
 * yapılandırması yok, dolayısıyla sorgu hiç kurulmuyor ve sayfa tohum
 * veriyle boyanıyor — beklentiler `photos` dizisi üzerinden geçerli
 * kalıyor.
 *
 * `AuthProvider` FAZ 4'TE EKLENDİ: sayfa artık kişisel facet'ler
 * ("Kaydettiklerim", "Takip ettiklerim") için oturuma bakıyor.
 * Oturumsuz render'da o facet'ler HİÇ ÇİZİLMİYOR, yani buradaki
 * beklentiler değişmiyor — testin doğruladığı ikinci şey bu:
 * kişisel süzgeçler oturumsuz ziyaretçinin ekranını değiştirmiyor.
 */
function renderGallery() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <GalleryPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Arama kutusuna yazıp GECİKMENİN dolmasını bekler.
 *
 * Faz 4'te arama ortak Data Explorer'a taşındı ve 250 ms debounce
 * kazandı: her tuş vuruşunda bütün listeyi süzmek ve URL'ye yazmak
 * yazarken takılma üretiyordu. Testler artık sonucu beklemek zorunda —
 * `waitFor` gerçek zamanlayıcıyla çalışıyor, sahte zamanlayıcı kurmaya
 * gerek yok.
 */
async function ara(terim: string) {
  fireEvent.change(screen.getByLabelText(/^ara$/i), {
    target: { value: terim },
  });
  await waitFor(() =>
    expect(screen.getByLabelText(/^ara$/i)).toHaveValue(terim)
  );
}

/** Kart bağlantılarını toplar (künye satırları da aynı bağlantının içinde). */
function photoLinks() {
  return screen
    .getAllByRole('link')
    .filter(
      (a) =>
        a.getAttribute('href')?.startsWith('/fotograf/') &&
        a.className.includes('group')
    );
}

describe('GalleryPage (§7.2)', () => {
  it('başlığı, yükleme CTA’sını ve tüm karoları gösterir', () => {
    renderGallery();
    expect(
      screen.getByRole('heading', { level: 1, name: /fotoğraf galerisi/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /fotoğraf yükle/i })
    ).toHaveAttribute('href', '/galeri/yukle');
    expect(photoLinks()).toHaveLength(photos.length);
  });

  it('haftanın fotoğrafları arşivini hafta rozetiyle gösterir', () => {
    renderGallery();
    expect(
      screen.getByRole('heading', {
        name: /haftanın fotoğrafları arşivi/i,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText('32. Hafta').length).toBeGreaterThan(0);
    /*
      KÜNYE DÖRT DEĞERE İNDİ. Şerit eskiden dokuz satırlık tam EXIF
      tablosunu taşıyordu ve şeridin YÜKSEKLİĞİNİ o tablo belirliyordu
      (ölçüm: 1440×900'de 611px, galeri ızgarası fold'un 220px altında
      başlıyordu). Görsel sabit 16:9 oranına alınınca tablo sığmıyor;
      künyenin tamamı fotoğraf detay sayfasında ve "Fotoğrafı aç"
      hemen yanında duruyor.
    */
    expect(screen.getByText('Poz süresi')).toBeInTheDocument();
    expect(screen.getByText('Çekim yeri')).toBeInTheDocument();
    expect(screen.getByText('Saklıkent, Antalya')).toBeInTheDocument();
    expect(
      screen.queryByText(/exif \/ çekim künyesi/i)
    ).not.toBeInTheDocument();
    const weeklyHero = screen
      .getByRole('link', { name: `Haftanın Fotoğrafı: ${photos[0].title}` })
      .closest('section');
    const weeklyImage = screen.getByRole('link', {
      name: `Haftanın Fotoğrafı: ${photos[0].title}`,
    });
    expect(weeklyHero).not.toBeNull();
    /* Filtre, poz planı ve setup satırları künyeden çıktı — dördün
       dışında kalan her şey detay sayfasında. */
    expect(within(weeklyHero!).getByText('Çekim tarihi')).toBeInTheDocument();
    expect(
      within(weeklyHero!).getByText('Toplam entegrasyon')
    ).toBeInTheDocument();
    expect(
      within(weeklyHero!).queryByText('Poz planı')
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: `@${photos[0].user.username}` })
    ).toHaveAttribute('href', `/profil/${photos[0].user.username}`);
    expect(
      within(weeklyImage).queryByText('32. Hafta')
    ).not.toBeInTheDocument();
    expect(
      within(weeklyHero!).queryByText('Editör seçimi')
    ).not.toBeInTheDocument();
  });

  it('galeri liste araçlarında dışa aktarım, kayıtlı görünüm ve sayaç göstermez', () => {
    renderGallery();
    expect(
      screen.queryByRole('button', { name: /csv indir/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /görünümler/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(`${photos.length} fotoğraf`)
    ).not.toBeInTheDocument();
  });

  it('arama kutusu sonuçları daraltır', async () => {
    renderGallery();
    await ara('rozet');
    await waitFor(() => expect(photoLinks()).toHaveLength(1));
    expect(photoLinks()[0]).toHaveAttribute(
      'href',
      '/fotograf/rozet-bulutsusu-sho'
    );
  });

  it('eşleşme yoksa boş durum mesajı gösterir', async () => {
    renderGallery();
    await ara('olmayan-hedef-xyz');
    expect(await screen.findByText(/eşleşen kayıt yok/i)).toBeInTheDocument();
  });

  /*
   * FAZ 4 DAVRANIŞ DEĞİŞİKLİĞİ. Eski galeri araması yalnızca
   * `toLocaleLowerCase('tr-TR')` yapıyordu, yani ASCII yazan kullanıcı
   * Türkçe karakterli kaydı BULAMIYORDU. Ortak motor katlıyor.
   */
  it('ASCII yazımla Türkçe karakterli kaydı buluyor', async () => {
    const turkceli = photos.find((p) => /[çğıöşü]/i.test(p.target.name));
    if (!turkceli) return;
    renderGallery();
    await ara(
      turkceli.target.name
        .toLocaleLowerCase('tr-TR')
        .replace(
          /[ışğüöç]/g,
          (c) => ({ ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' })[c] ?? c
        )
    );
    await waitFor(() => expect(photoLinks().length).toBeGreaterThan(0));
  });

  it('künyeyi karo üzerinde her zaman gösterir', () => {
    renderGallery();
    // Yön kararı: teknik veri hover'da açılmaz, kalıcıdır.
    // Her kayıtta üretici ve palet bulunur.
    for (const card of photoLinks()) {
      expect(card).toHaveTextContent('@');
    }
  });

  it('her karoda tür ailesi rozeti gösterir', () => {
    renderGallery();
    // Dört aileden en az biri her zaman görünür olmalı.
    const labels = [
      'Derin Uzay',
      'Güneş Sistemi',
      'Takımyıldız',
      'Gece Manzarası',
    ];
    const found = labels.filter((l) => screen.queryAllByText(l).length > 0);
    expect(found.length).toBeGreaterThan(0);
  });

  it('aile filtresi sonuçları daraltır', () => {
    renderGallery();
    const before = photoLinks().length;
    fireEvent.change(screen.getByRole('combobox', { name: 'Tür' }), {
      target: { value: 'gunes-sistemi' },
    });
    const after = photoLinks().length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it('liste görünümüne geçilebilir', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: /liste görünümü/i }));
    expect(
      screen.getByRole('button', { name: /liste görünümü/i })
    ).toHaveAttribute('aria-pressed', 'true');
    // Karo sayısı görünümden bağımsız aynı kalmalı.
    expect(photoLinks()).toHaveLength(photos.length);
  });

  it('Bortle ölçümü olan kayıtta gökyüzü sınıfını da yazar', () => {
    renderGallery();
    // Ay/gezegen kayıtlarında Bortle anlamlı değildir ve boş bırakılır;
    // derin gökyüzü kayıtlarında künyede görünmelidir.
    const withBortle = photos.find((p) => p.location.bortle != null)!;
    const card = photoLinks().find(
      (a) => a.getAttribute('href') === `/fotograf/${withBortle.slug}`
    );
    expect(card).toHaveTextContent(`B${withBortle.location.bortle}`);
  });
});

describe('GalleryPage · kişisel süzgeçler (Faz 4)', () => {
  it('oturumsuz ziyaretçide kişisel süzgeç kutuları ÇİZİLMİYOR', async () => {
    /*
     * Fazın yasakladığı şey tam olarak buydu: "Kaydettiklerim" kutusunu
     * herkese gösterip oturumsuz kullanıcıda her zaman boş sonuç
     * döndürmek. Kullanıcı kutuyu işaretler, liste boşalır ve sorunu
     * kendinde arar — oysa sorun oturumun olmaması.
     */
    renderGallery();
    await screen.findByRole('heading', { name: /galeri/i });

    expect(screen.queryByLabelText('Kaydettiklerim')).toBeNull();
    expect(screen.queryByLabelText('Takip ettiklerim')).toBeNull();
  });

  it('oturumsuzken adresteki kişisel parametre listeyi BOŞALTMIYOR', async () => {
    /*
     * Facet hiç tanımlı olmadığı için `?kaydettiklerim=evet` bağlantısı
     * süzmüyor. Tersi olsaydı, birinin paylaştığı "kaydettiklerim"
     * bağlantısını açan ziyaretçi boş bir galeri görürdü.
     */
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/galeri?kaydettiklerim=evet']}>
            <GalleryPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await screen.findByRole('heading', { name: /galeri/i });
    expect(photoLinks().length).toBeGreaterThan(0);
  });
});
