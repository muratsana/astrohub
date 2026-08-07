import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DistrictFilterCell } from './DistrictFilterCell';

/**
 * İLÇE SÜZGECİ — davranışın ölçülen kısmı.
 *
 * En önemli iddia ilk testte: HİÇ İLÇE YOKSA SÜZGEÇ ÇİZİLMİYOR. İlçe
 * alanı yeni ve mevcut kayıtların hiçbirinde dolu değil; boş bir menü
 * göstermek kullanıcıya süzgecin bozuk olduğunu söylerdi
 * (`personalFacets.ts` başlığındaki kuralın aynısı).
 */
describe('DistrictFilterCell', () => {
  it('hiç ilçe yoksa hiç çizilmiyor', () => {
    const { container } = render(
      <DistrictFilterCell
        id="t"
        counts={new Map()}
        selected={undefined}
        onSelect={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('ilçeleri Türkçe alfabetik sırayla ve sayılarıyla listeliyor', () => {
    render(
      <DistrictFilterCell
        id="t"
        counts={new Map([
          ['Üsküdar', 2],
          ['Çankaya', 5],
          ['Ataşehir', 1],
        ])}
        selected={undefined}
        onSelect={() => {}}
      />
    );

    const secenekler = screen
      .getAllByRole('option')
      .map((o) => o.textContent);

    // "Çankaya" C'den sonra, "Üsküdar" U'dan sonra — `localeCompare(tr)`
    // olmadan ikisi de listenin sonuna düşerdi.
    expect(secenekler).toEqual([
      'Tüm ilçeler',
      'Ataşehir (1)',
      'Çankaya (5)',
      'Üsküdar (2)',
    ]);
  });

  it('seçim yapınca ilçe adını bildiriyor', () => {
    const onSelect = vi.fn();
    render(
      <DistrictFilterCell
        id="t"
        counts={new Map([['Kadıköy', 3]])}
        selected={undefined}
        onSelect={onSelect}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Kadıköy' },
    });
    expect(onSelect).toHaveBeenCalledWith('Kadıköy');
  });

  it('"Tüm ilçeler" seçimi kaldırıyor', () => {
    // Sentinel değer ("hepsi") çağırana SIZMIYOR: dışarısı yalnızca
    // "ilçe var" ya da "yok" biliyor, süzgecin iç sözlüğünü değil.
    const onSelect = vi.fn();
    render(
      <DistrictFilterCell
        id="t"
        counts={new Map([['Kadıköy', 3]])}
        selected="Kadıköy"
        onSelect={onSelect}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'hepsi' },
    });
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it('seçili ilçeyi gösteriyor', () => {
    render(
      <DistrictFilterCell
        id="t"
        counts={new Map([['Kadıköy', 3], ['Beşiktaş', 1]])}
        selected="Beşiktaş"
        onSelect={() => {}}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('Beşiktaş');
  });
});
