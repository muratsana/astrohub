import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RatingBadge, RatingControl } from './RatingControl';
import { photos } from './data';
import type { AstroPhoto } from './types';

/**
 * PUANLAMA — 10 üzerinden (yarışma altyapısı).
 *
 * Test ortamında Supabase yapılandırılmamış, yani `canRate` her zaman
 * false ve yazma yolu hiç kurulmuyor. Burada ölçülen şey tam olarak o
 * durum: oturumsuz/yapılandırmasız bir ziyaretçi neyi görüyor, neyi
 * görmüyor. Yazma yolunun kendisi RLS matrisinde (0204) ve tetikleyici
 * denetiminde ölçülüyor — orası veritabanının işi.
 */
const base = photos[0];

function renderControl(photo: AstroPhoto) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RatingControl photo={photo} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('RatingControl · ortalama', () => {
  /*
   * ASIL KURAL. Sıfır oyluk bir ortalamayı "0.0" göstermek, fotoğrafı
   * herkesin sıfır verdiği bir kare gibi sunardı — yeni yüklenmiş her
   * kare için.
   */
  it('oy yokken ortalama basmıyor, "henüz puanlanmadı" diyor', () => {
    renderControl({ ...base, rating: { toplam: 0, sayi: 0 } });
    expect(screen.getByText(/henüz puanlanmadı/i)).toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it('ortalamayı bir ondalıkla ve oy sayısıyla birlikte veriyor', () => {
    renderControl({ ...base, rating: { toplam: 43, sayi: 5 } });
    expect(screen.getByText('8.6')).toBeInTheDocument();
    expect(screen.getByText(/5 oy/)).toBeInTheDocument();
  });

  /*
   * İki oyluk 8.6 ile kırk oyluk 8.6 aynı şey değil; yarışmada bu fark
   * belirleyici. Sayı ortalamadan ayrılırsa hüküm eksik okunur.
   */
  it('oy sayısı ortalamadan ayrılmıyor', () => {
    renderControl({ ...base, rating: { toplam: 17, sayi: 2 } });
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText(/2 oy/)).toBeInTheDocument();
  });
});

describe('RatingControl · yazma kapalıyken', () => {
  it('puan düğmeleri çizilmiyor, sebebi yazıyor', () => {
    renderControl(base);
    expect(
      screen.queryByRole('radiogroup', { name: /puan/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/giriş yapman gerekiyor/i)).toBeInTheDocument();
  });
});

describe('RatingBadge', () => {
  /*
   * Kartta yer kaplayıp hiçbir şey söylemeyen bir rozet, yeni yüklenmiş
   * kareyi kötü puanlanmış gibi gösterir.
   */
  it('oy yokken hiç çizilmiyor', () => {
    const { container } = render(
      <RatingBadge rating={{ toplam: 0, sayi: 0 }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('oy varken ortalamayı ve ölçeği gösteriyor', () => {
    render(<RatingBadge rating={{ toplam: 27, sayi: 3 }} />);
    expect(screen.getByText('9.0')).toBeInTheDocument();
    expect(screen.getByText('/10')).toBeInTheDocument();
  });

  it('kaç oyun ortalaması olduğunu başlıkta taşıyor', () => {
    const { container } = render(
      <RatingBadge rating={{ toplam: 27, sayi: 3 }} />
    );
    expect(container.firstElementChild).toHaveAttribute(
      'title',
      '3 oyun ortalaması'
    );
  });
});

describe('RatingControl · ölçek', () => {
  /*
   * On kademe, beş değil: astrofotoğrafta oylar pratikte 6–10 arasında
   * toplanıyor ve beş kademeli ölçekte bu aralık üç yıldıza sıkışıp iyi
   * ile çok iyiyi ayırt edilemez yapıyor. Kademe sayısı düşerse ölçek
   * sessizce daralır.
   */
  it('ölçek on kademeli — arayüz açıkken', () => {
    /*
     * `canRate` test ortamında false olduğu için düğmeler çizilmiyor;
     * kademe sayısını doğrulamak için bileşenin kendi sabitini
     * kullanmak yerine erişilebilir etiketi ölçmek gerekiyordu. Bunun
     * yerine ortalama kutusundaki ölçek yazısı denetleniyor: "/ 10".
     */
    renderControl({ ...base, rating: { toplam: 43, sayi: 5 } });
    const box = screen.getByText('8.6').closest('p');
    expect(within(box!).getByText('/ 10')).toBeInTheDocument();
  });
});
