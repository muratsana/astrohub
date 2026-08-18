import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RatingChip } from './RatingChip';
import { RatingBadge } from './RatingBadge';
import { photos } from './data';
import type { AstroPhoto } from './types';

/**
 * PUANLAMA — 10 üzerinden (yarışma altyapısı).
 *
 * Büyük panel kaldırıldı: eylem şeridine kompakt bir düğme geldikten
 * sonra aynı iş sayfada iki kez duruyordu. Ortalama rozette, oy verme
 * düğmede.
 *
 * Test ortamında Supabase yapılandırılmamış, yani `canRate` her zaman
 * false. Burada ölçülen şey tam olarak o durum: yazamayan ziyaretçi
 * neyi görüyor, neyi görmüyor. Yazma yolunun kendisi RLS matrisinde
 * (0204) ölçülüyor — orası veritabanının işi.
 */
const base = photos[0];

function cizChip(photo: AstroPhoto) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RatingChip photo={photo} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('RatingChip', () => {
  /*
   * Puan veremeyecek kişiye düğme göstermek, tıklayınca sunucunun
   * reddettiği anlamsız bir hata mesajı demekti. Kural RLS'te; buradaki
   * gizleme nezaket.
   */
  it('puan veremeyen ziyaretçide hiç çizilmiyor', () => {
    const { container } = cizChip(base);
    expect(container).toBeEmptyDOMElement();
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

  /*
   * İki oyluk 8.6 ile kırk oyluk 8.6 aynı şey değil; yarışmada bu fark
   * belirleyici. Rozet dar olduğu için sayı başlıkta taşınıyor —
   * kaybolmuyor.
   */
  it('kaç oyun ortalaması olduğunu başlıkta taşıyor', () => {
    const { container } = render(
      <RatingBadge rating={{ toplam: 27, sayi: 3 }} />
    );
    expect(container.firstElementChild).toHaveAttribute(
      'title',
      '3 oyun ortalaması'
    );
  });

  /* Ortalama bir ondalıkla yazılıyor: "8.6" ile "8.60" arasındaki fark
     yok ama ikincisi tabloyu genişletiyor. */
  it('ortalamayı bir ondalıkla veriyor', () => {
    render(<RatingBadge rating={{ toplam: 43, sayi: 5 }} />);
    expect(screen.getByText('8.6')).toBeInTheDocument();
  });
});
