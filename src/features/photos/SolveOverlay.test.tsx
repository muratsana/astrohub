import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SolveOverlay } from './SolveOverlay';
import type { PlateSolve } from './types';

function solve(over: Partial<PlateSolve> = {}): PlateSolve {
  return {
    durum: 'cozuldu',
    raDeg: 10.6847,
    decDeg: 41.269,
    rotationDeg: 12.34,
    scaleArcsecPx: 1.234,
    fieldWidthDeg: 2.5,
    fieldHeightDeg: 1.6,
    provider: 'astrometry.net',
    error: null,
    solvedAt: '2026-08-18T00:00:00Z',
    ...over,
  } as PlateSolve;
}

describe('alan çözümü katmanı', () => {
  /*
   * ÇÖZÜLMEMİŞ KAYITTA HİÇ ÇİZİLMİYOR. "Sırada" ya da "başarısız"
   * durumunda gösterilecek ölçüm yok; boş bir kutu açmak kullanıcıya
   * veri varmış gibi gösterirdi.
   */
  it('yalnızca çözülmüş kayıtta çiziliyor', () => {
    for (const durum of ['yok', 'kuyrukta', 'basarisiz'] as const) {
      const { container } = render(<SolveOverlay solve={solve({ durum })} />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  /* Koordinatı olmayan "çözüldü" kaydı tutarsız; gösterilecek merkez
     yoksa katman da yok. */
  it('koordinat yoksa çizilmiyor', () => {
    const { container } = render(
      <SolveOverlay solve={solve({ raDeg: null, decDeg: null })} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  /*
   * RA SAAT OLARAK OKUNUYOR. Dereceyi olduğu gibi göstermek
   * astrofotoğrafçı için okunmayan bir sayı olurdu; M31'in merkezi
   * 10.6847° = 0sa 42dk 44sn.
   */
  it('sağ açıklığı saat/dakika/saniye veriyor', () => {
    render(<SolveOverlay solve={solve()} />);
    expect(screen.getByText('0sa 42dk 44sn')).toBeInTheDocument();
  });

  it('dik açıklığı işaretli derece veriyor', () => {
    render(<SolveOverlay solve={solve()} />);
    expect(screen.getByText('+41° 16′')).toBeInTheDocument();
  });

  it('negatif dik açıklıkta işaret dönüyor', () => {
    render(<SolveOverlay solve={solve({ decDeg: -5.5 })} />);
    expect(screen.getByText('−5° 30′')).toBeInTheDocument();
  });

  it('alan ve ölçek gösteriliyor', () => {
    render(<SolveOverlay solve={solve()} />);
    expect(screen.getByText('2.50° × 1.60°')).toBeInTheDocument();
    expect(screen.getByText('1.23 ″/px')).toBeInTheDocument();
  });

  /* Eksik alan satırı hiç çizilmiyor — "—" yazmak, ölçülmemiş bir
     değeri ölçülmüş gibi göstermenin yumuşak hâli olurdu. */
  it('eksik ölçüler satır üretmiyor', () => {
    render(
      <SolveOverlay
        solve={solve({ scaleArcsecPx: null, fieldWidthDeg: null, fieldHeightDeg: null })}
      />
    );
    expect(screen.queryByText('Ölçek')).not.toBeInTheDocument();
    expect(screen.queryByText('Alan')).not.toBeInTheDocument();
    expect(screen.getByText('Dönüklük')).toBeInTheDocument();
  });
});
