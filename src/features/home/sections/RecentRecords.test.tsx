import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * BOŞ GALERİ DAVRANIŞI.
 *
 * Canlıda görülen hata buydu: "0 fotoğraf" başlığının altında yüz
 * piksellik boşluk. Bölüm boş listede yalnızca başlığı çiziyordu.
 *
 * Boşluk yayın öncesi geçici bir durum değil, T-203'ün doğrudan sonucu —
 * boş bir veritabanı tablosu artık üretimde tohum veriye düşmüyor. Yani
 * bu durum sitenin normal bir hâli ve arayüzün bir cevabı olmak zorunda.
 */

const catalog = vi.hoisted(() => ({
  items: [] as unknown[],
  status: 'ready' as 'loading' | 'ready' | 'error',
  refresh: () => {},
}));

vi.mock('@/services/content/photos', () => ({
  usePhotoCatalog: () => catalog,
}));

import { RecentRecords } from './RecentRecords';

function renderSection() {
  return render(
    <MemoryRouter>
      <RecentRecords />
    </MemoryRouter>
  );
}

beforeEach(() => {
  catalog.items = [];
  catalog.status = 'ready';
});

describe('RecentRecords — galeri boşken', () => {
  it('sessiz boşluk yerine açıklama gösterir', () => {
    renderSection();
    expect(
      screen.getByText(/henüz yayımlanmış fotoğraf yok/i)
    ).toBeInTheDocument();
  });

  /*
   * Ölü bir cümle değil çağrı: burası sitenin çekirdek içeriği ve boş
   * olması ilk yükleyecek kişi için bir fırsat. Kardeş bölümlerde
   * ("Yayında ilan yok") çağrı yok çünkü ilan ikincil; galeri değil.
   */
  it('yükleme sayfasına çağrı taşır', () => {
    renderSection();
    /* Desende "İlk" YOK ve bu bilinçli: JS'in büyük İ'yi küçültmesi `i`
       değil `i̇` (i + birleşen nokta) üretiyor, dolayısıyla `/ilk/i` bu
       adla EŞLEŞMİYOR. Depoda aynı tuzak `includesTr` ile belgelenmiş. */
    const cta = screen.getByRole('link', { name: /kareyi sen yükle/i });
    expect(cta).toHaveAttribute('href', '/galeri/yukle');
  });

  it('boş listede karo ızgarası çizilmez', () => {
    const { container } = renderSection();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('sayaç yine de görünür — boş olduğu gizlenmiyor', () => {
    renderSection();
    expect(screen.getByText('0 fotoğraf')).toBeInTheDocument();
  });
});

/**
 * MODÜLÜN DURUM AYRIMI (§6.2).
 *
 * Belge altı durumu birbirinden ayırmayı istiyor. Üçü bu bileşende
 * ölçülebiliyor; kalan üçünün nerede çözüldüğü `select.ts` içinde yazılı
 * (kırık görsel → `RemoteImage`, moderasyon → sorgu zaten döndürmüyor,
 * admin kapatması → Faz 10).
 */
describe('durum ayrımı', () => {
  /*
   * ASIL KAZANIM. Sorgu sonuçlanana kadar `selectContent` TOHUM listesini
   * veriyordu; yani kullanıcı bir an kurgu fotoğrafları gerçek sanıp
   * sonra hepsinin değiştiğini görüyordu. İskelet o yanılgıyı bitiriyor.
   */
  it('yükleniyorken kurgu fotoğraf değil iskelet çiziyor', () => {
    catalog.status = 'loading';
    catalog.items = [{ slug: 'tohum-1' }];
    const { container } = renderSection();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    /* İskelet blokları ekran okuyucuya görünmez; gerçek karo bağlantısı
       hiç çizilmemeli. */
    expect(screen.queryByRole('link', { name: /tohum/i })).toBeNull();
  });

  /*
   * İskelet ızgarası gerçek ızgarayla AYNI sınıfı kullanmalı; yoksa liste
   * gelince kartlar yerinden oynar (CLS).
   */
  it('iskelet ızgarası gerçek ızgarayla aynı sınıfı taşıyor', () => {
    catalog.status = 'loading';
    const { container } = renderSection();
    const iskelet = container.querySelector('ul');

    catalog.status = 'ready';
    catalog.items = [];
    expect(iskelet?.className).toContain('grid-cols-2');
    expect(iskelet?.className).toContain('lg:grid-cols-5');
  });

  it('hata durumunda site ayakta kalıyor ve yeniden deneme sunuluyor', () => {
    catalog.status = 'error';
    renderSection();

    expect(screen.getByText(/okunamadı/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /yeniden dene/i })
    ).toBeInTheDocument();
  });

  /*
   * Hatada TOHUM ÇİZİLMİYOR: gerçek sanılabilecek kurgu içerik göstermek,
   * hiçbir şey göstermemekten kötü.
   */
  it('hata durumunda tohum listesi çizilmiyor', () => {
    catalog.status = 'error';
    catalog.items = [{ slug: 'tohum-1' }];
    const { container } = renderSection();
    expect(container.querySelector('ul')).toBeNull();
  });

  /*
   * "Boşsa gizle" bir AYAR (belge: "admin panelinden yönetilebilir
   * olmalıdır"). Varsayılan gizlemek değil çağrı yapmak; açıldığında
   * modül tamamen kayboluyor.
   */
  it('hideWhenEmpty açıkken modül tamamen gizleniyor', () => {
    const { container } = render(
      <MemoryRouter>
        <RecentRecords hideWhenEmpty />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('hideWhenEmpty açık olsa bile yükleniyorken gizlenmiyor', () => {
    /* Yükleniyorken gizlemek sayfanın ortasında bir zıplama üretir. */
    catalog.status = 'loading';
    const { container } = render(
      <MemoryRouter>
        <RecentRecords hideWhenEmpty />
      </MemoryRouter>
    );
    expect(container.firstChild).not.toBeNull();
  });
});
