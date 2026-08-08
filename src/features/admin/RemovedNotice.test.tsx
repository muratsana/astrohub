import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RemovedNotice } from './RemovedNotice';

/**
 * KALDIRILAN İÇERİĞİN YERİ.
 *
 * Ölçülen şey görsel değil, ANLAM: okuyan kişi (a) bir şeyin
 * kaldırıldığını ve (b) nedenini görüyor mu. İkisinden biri eksikse
 * kaldırma keyfî görünüyor.
 */
describe('RemovedNotice', () => {
  it('kaldırıldığını ve gerekçesini birlikte söylüyor', () => {
    render(<RemovedNotice reason="Topluluk kurallarına uymadı." />);

    expect(screen.getByText(/kaldırıldı/i)).toBeInTheDocument();
    expect(screen.getByText('Topluluk kurallarına uymadı.')).toBeInTheDocument();
  });

  /*
   * Gerekçe İÇERİKTEN geliyor ve düz metin olarak basılıyor. React
   * kaçırmayı kendisi yapıyor; test bunu bir kez sabitliyor çünkü
   * gelecekte "gerekçede bağlantı olsun" isteği `dangerouslySetInnerHTML`
   * ile çözülmeye çalışılırsa moderasyon kutusu XSS yüzeyine dönüşür.
   */
  it('gerekçeyi düz metin olarak basıyor', () => {
    const { container } = render(
      <RemovedNotice reason={'<img src=x onerror="alert(1)">'} />
    );

    expect(container.querySelector('img')).toBeNull();
    expect(
      screen.getByText('<img src=x onerror="alert(1)">')
    ).toBeInTheDocument();
  });

  /*
   * Ekran okuyucuda blok, iletinin kendisi değil onun yerine geçen bir
   * NOT. Düz paragraf olsaydı kullanıcı gerekçeyi yazarın cümlesi
   * sanırdı.
   */
  it('not olarak işaretleniyor', () => {
    render(<RemovedNotice reason="Gerekçe." />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
