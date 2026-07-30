import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';

/**
 * Bu bileşenin varlık sebebi tekrarı kaldırmak değil, DAVRANIŞI garanti
 * etmek: 17 elle yazılmış blokta `role="alert"` bazı yerde vardı bazı
 * yerde yoktu ve punto dört farklı değer alıyordu. Testler tam olarak o
 * iki şeyi kilitliyor.
 */
describe('Alert', () => {
  it('her zaman duyurulur — role="alert" çağırana bırakılmaz', () => {
    render(<Alert>Bir şeyler ters gitti</Alert>);
    expect(screen.getByRole('alert').textContent).toBe('Bir şeyler ters gitti');
  });

  it('varsayılan ton hata', () => {
    render(<Alert>hata</Alert>);
    expect(screen.getByRole('alert').className).toMatch(/text-danger/);
  });

  it('tonlar ayrı renk taşır', () => {
    const { unmount } = render(<Alert tone="success">tamam</Alert>);
    expect(screen.getByRole('alert').className).toMatch(/text-success/);
    unmount();

    render(<Alert tone="warning">dikkat</Alert>);
    expect(screen.getByRole('alert').className).toMatch(/text-warning/);
  });

  it('box varyantı çerçeve ve zemin taşır, text varyantı taşımaz', () => {
    const { unmount } = render(<Alert>kutulu</Alert>);
    const boxed = screen.getByRole('alert').className;
    expect(boxed).toMatch(/border/);
    expect(boxed).toMatch(/bg-surface-1/);
    unmount();

    render(<Alert variant="text">düz</Alert>);
    const plain = screen.getByRole('alert').className;
    expect(plain).not.toMatch(/bg-surface-1/);
  });

  it('punto her varyantta aynı token — dört farklı ölçüye dağılmıyor', () => {
    const { unmount } = render(<Alert>a</Alert>);
    expect(screen.getByRole('alert').className).toMatch(/text-body-sm/);
    unmount();

    render(<Alert variant="text">b</Alert>);
    expect(screen.getByRole('alert').className).toMatch(/text-body-sm/);
  });

  it('id verilebilir — aria-describedby ile alana bağlanmak için', () => {
    render(<Alert id="ad-error">zorunlu</Alert>);
    expect(screen.getByRole('alert').id).toBe('ad-error');
  });

  it('className yalnızca boşluk ekler, rengi ezmez', () => {
    render(<Alert className="mt-2">x</Alert>);
    const cls = screen.getByRole('alert').className;
    expect(cls).toMatch(/mt-2/);
    expect(cls).toMatch(/text-danger/);
  });
});
