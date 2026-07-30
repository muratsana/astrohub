import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CatalogSourceNote } from './CatalogSourceNote';

/**
 * Kaynağa göre notun üç hâli: bozulma uyarısı, örnek içerik bandı, sessizlik.
 * "Örnek içerik" bandı QA denetiminin P0-02 maddesinin karşılığı — üretimde
 * tohum veri hiçbir zaman etiketsiz gösterilmez; regresyonu burada kilitli.
 */
describe('CatalogSourceNote', () => {
  it('bozulma hâlinde ulaşılamama uyarısı basar', () => {
    render(
      <CatalogSourceNote
        selection={{ degraded: true, source: 'seed', configured: true }}
      />
    );
    expect(screen.getByRole('status').textContent).toMatch(/ulaşılamadı/);
  });

  it('veritabanı boşken tohum gösteriliyorsa "örnek içerik" bandı basar', () => {
    render(
      <CatalogSourceNote
        selection={{ degraded: false, source: 'seed', configured: true }}
      />
    );
    expect(screen.getByRole('status').textContent).toMatch(/Örnek içerik/);
  });

  it('yapılandırma yokken (önizleme/çevrimdışı) sessiz kalır', () => {
    const { container } = render(
      <CatalogSourceNote
        selection={{ degraded: false, source: 'seed', configured: false }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('canlı veritabanı kayıtlarında hiçbir not basmaz', () => {
    const { container } = render(
      <CatalogSourceNote
        selection={{ degraded: false, source: 'db', configured: true }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
