import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

/**
 * PANEL — collapsible ve deep-link çapası (E06, E07).
 *
 * Profil bölümleri artık aç/kapa native `<details>` ve URL hash'iyle
 * hedeflenebilir. Bu testler o iki sözleşmeyi sabitliyor: collapsible
 * modda header bir `<summary>` olur, id `<details>`e taşınır ve panel
 * varsayılan açık gelir (içerik gizlenmesin).
 */
describe('Panel — collapsible (E06/E07)', () => {
  it('normal modda <section>, header var, details yok', () => {
    const { container } = render(
      <Panel title="Ekipmanlar">
        <p>içerik</p>
      </Panel>
    );
    expect(container.querySelector('section')).toBeTruthy();
    expect(container.querySelector('details')).toBeNull();
  });

  it('collapsible modda <details> + <summary> üretir ve varsayılan açık', () => {
    const { container } = render(
      <Panel title="Ekipmanlar" collapsible id="ekipmanlar">
        <p>içerik</p>
      </Panel>
    );
    const details = container.querySelector('details');
    expect(details).toBeTruthy();
    expect(details?.open).toBe(true);
    expect(details?.id).toBe('ekipmanlar');
    expect(container.querySelector('summary')).toBeTruthy();
    // Başlık erişilebilir kalmalı (h2 varsayılan).
    expect(screen.getByRole('heading', { name: 'Ekipmanlar' })).toBeTruthy();
  });

  it('defaultOpen=false ile kapalı başlar', () => {
    const { container } = render(
      <Panel title="Forum" collapsible defaultOpen={false}>
        <p>içerik</p>
      </Panel>
    );
    expect(container.querySelector('details')?.open).toBe(false);
  });

  it('id verilince scroll-mt-20 çapası ekler', () => {
    const { container } = render(
      <Panel title="İlanlar" id="ilanlar">
        <p>içerik</p>
      </Panel>
    );
    const section = container.querySelector('section');
    expect(section?.id).toBe('ilanlar');
    expect(section?.className).toContain('scroll-mt-20');
  });
});
