import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MIN_ACIKLAMA, ReportButton } from './ReportButton';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, configured: true }),
}));

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => null,
  isSupabaseConfigured: true,
}));

function ac() {
  render(<ReportButton targetType="photo" targetId="m31" targetPath="/fotograf/m31" />);
  fireEvent.click(screen.getByRole('button', { name: /bildir/i }));
}

describe('şikâyet açıklaması', () => {
  /*
   * AÇIKLAMA ZORUNLU. Alan eskiden "isteğe bağlı"ydı ve boş
   * bırakılıyordu: canlıdaki tek şikâyet kaydının açıklaması sıfır
   * karakter ve moderatörün elinde yalnızca "telif ihlali" etiketi
   * kaldı. Bir tıkla gönderilebilen şikâyet kötüye kullanımı da
   * ucuzlatıyor.
   */
  it('boş açıklamada gönderilemiyor', () => {
    ac();
    expect(screen.getByRole('button', { name: /gönder/i })).toBeDisabled();
  });

  it('form açıldığında tetikleyici butonu akıştan çıkarmıyor', () => {
    const { container } = render(
      <ReportButton
        targetType="photo"
        targetId="m31"
        targetPath="/fotograf/m31"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /bildir/i }));

    expect(screen.getByRole('button', { name: /^Bildir$/ })).toBeInTheDocument();
    expect(screen.getByText('İçeriği bildir').closest('div')).toHaveClass(
      'absolute'
    );
    expect(container.querySelector('.relative.inline-flex')).toBeInTheDocument();
  });

  it('eşiğin altında gönderilemiyor', () => {
    ac();
    fireEvent.change(screen.getByLabelText(/açıklama/i), {
      target: { value: 'a'.repeat(MIN_ACIKLAMA - 1) },
    });
    expect(screen.getByRole('button', { name: /gönder/i })).toBeDisabled();
  });

  it('eşikte gönderilebiliyor', () => {
    ac();
    fireEvent.change(screen.getByLabelText(/açıklama/i), {
      target: { value: 'a'.repeat(MIN_ACIKLAMA) },
    });
    expect(screen.getByRole('button', { name: /gönder/i })).toBeEnabled();
  });

  /* Baştaki/sondaki boşluk saymıyor: 120 boşluk yazıp göndermek,
     kuralın etrafından dolaşmanın en kolay yolu olurdu. */
  it('yalnızca boşluk eşiği geçmiyor', () => {
    ac();
    fireEvent.change(screen.getByLabelText(/açıklama/i), {
      target: { value: ' '.repeat(MIN_ACIKLAMA + 10) },
    });
    expect(screen.getByRole('button', { name: /gönder/i })).toBeDisabled();
  });

  it('sayaç kalan karakteri gösteriyor', () => {
    ac();
    fireEvent.change(screen.getByLabelText(/açıklama/i), {
      target: { value: 'a'.repeat(40) },
    });
    expect(screen.getByText(`40 / ${MIN_ACIKLAMA} karakter`)).toBeInTheDocument();
  });
});
