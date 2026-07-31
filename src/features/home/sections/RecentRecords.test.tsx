import { describe, expect, it, vi } from 'vitest';
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

const catalog = vi.hoisted(() => ({ items: [] as unknown[] }));

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
